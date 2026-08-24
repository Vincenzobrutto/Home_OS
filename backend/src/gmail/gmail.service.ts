import { BadRequestException, Injectable } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { DocumentsService } from '../documents/documents.service';
import { createOAuthState, consumeOAuthState } from '../common/oauth-state';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Finestra di storico selezionabile dall'utente in fase di scansione
// (Gmail.tsx propone queste stesse opzioni in un <select>). Giorni fissi
// invece di mesi*30 per evitare ambiguità tra i due lati del contratto.
const SCAN_WINDOW_DAYS_BY_MONTHS: Record<number, number> = {
  2: 60,
  6: 182,
  12: 365,
  18: 547,
  24: 730,
};
const DEFAULT_SCAN_WINDOW_MONTHS = 24;

// Query di pre-filtro lato Gmail: riduce quante mail arrivano davvero a
// Claude (che costa) — euristica per parole chiave, stesso principio già
// usato per il mapping dei campi estratti (trasparente, niente training).
function buildSearchQuery(months: number): string {
  const days = SCAN_WINDOW_DAYS_BY_MONTHS[months];
  if (!days) {
    throw new BadRequestException(
      `Finestra di scansione non valida: ${months} mesi (valori ammessi: ${Object.keys(SCAN_WINDOW_DAYS_BY_MONTHS).join(', ')}).`,
    );
  }
  return `has:attachment newer_than:${days}d (fattura OR ordine OR ricevuta OR bolletta OR garanzia OR scontrino OR invoice OR receipt OR order OR warranty)`;
}

const SUPPORTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

// Tetto per scansione: una mailbox di 2 anni può avere centinaia di
// corrispondenze, ognuna delle quali costa una vera chiamata Claude.
// L'utente può ripetere la scansione (i messaggi già visti si saltano) per
// coprire il resto, invece di rischiare una spesa non prevista al primo giro.
const MAX_ATTACHMENTS_PER_SCAN = 30;

interface GmailAttachmentPart {
  filename: string;
  body?: { attachmentId?: string | null } | null;
}

@Injectable()
export class GmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly accessControl: AccessControlService,
  ) {}

  private oauthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Integrazione Gmail non configurata sul backend (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI mancanti in .env).',
      );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(userId: string): string {
    const client = this.oauthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      // "consent" forza Google a restituire sempre un refresh_token, anche
      // se l'utente aveva già autorizzato l'app in passato.
      prompt: 'consent',
      scope: SCOPES,
      // Nonce legato alla sessione che ha avviato il collegamento, non più
      // l'userId in chiaro — vedi common/oauth-state.ts.
      state: createOAuthState(userId),
    });
  }

  async handleCallback(code: string, state: string, userId: string) {
    if (!consumeOAuthState(state, userId)) {
      throw new BadRequestException(
        'Collegamento Gmail non valido o scaduto: riprova.',
      );
    }
    const client = this.oauthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    await this.prisma.gmailConnection.upsert({
      where: { userId },
      create: {
        userId,
        googleEmail: profile.data.emailAddress ?? '',
        accessToken: tokens.access_token ?? '',
        refreshToken: tokens.refresh_token ?? '',
        expiryDate: new Date(tokens.expiry_date ?? Date.now()),
      },
      update: {
        googleEmail: profile.data.emailAddress ?? '',
        accessToken: tokens.access_token ?? '',
        // Google non restituisce sempre un nuovo refresh_token alle
        // ri-autorizzazioni successive: se manca, tieni quello già salvato.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiryDate: new Date(tokens.expiry_date ?? Date.now()),
      },
    });
  }

  async getStatus(userId: string) {
    const conn = await this.prisma.gmailConnection.findUnique({
      where: { userId },
    });
    return conn
      ? { connected: true as const, email: conn.googleEmail }
      : { connected: false as const };
  }

  async disconnect(userId: string) {
    await this.prisma.gmailConnection.deleteMany({ where: { userId } });
  }

  private async getAuthorizedClient(userId: string) {
    const conn = await this.prisma.gmailConnection.findUnique({
      where: { userId },
    });
    if (!conn) {
      throw new BadRequestException(
        'Nessun account Gmail collegato per questo utente.',
      );
    }

    const client = this.oauthClient();
    client.setCredentials({
      access_token: conn.accessToken,
      refresh_token: conn.refreshToken,
      expiry_date: conn.expiryDate.getTime(),
    });

    // googleapis rinnova da solo l'access_token scaduto usando il refresh
    // token; qui salviamo il nuovo token quando viene rigenerato.
    client.on('tokens', (tokens) => {
      void this.prisma.gmailConnection.update({
        where: { userId },
        data: {
          ...(tokens.access_token ? { accessToken: tokens.access_token } : {}),
          ...(tokens.refresh_token
            ? { refreshToken: tokens.refresh_token }
            : {}),
          ...(tokens.expiry_date
            ? { expiryDate: new Date(tokens.expiry_date) }
            : {}),
        },
      });
    });

    return client;
  }

  async scan(
    houseId: string,
    userId: string,
    months: number = DEFAULT_SCAN_WINDOW_MONTHS,
  ) {
    await this.accessControl.assertHouseAccess(userId, houseId);
    const client = await this.getAuthorizedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth: client });

    const alreadySeen =
      await this.documents.gmailMessageIdsAlreadySeen(houseId);

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: buildSearchQuery(months),
      maxResults: 100,
    });
    const messages = listRes.data.messages ?? [];

    let candidatesCreated = 0;
    let messagesSkippedAlreadySeen = 0;
    let attachmentsFailed = 0;
    let attachmentsIrrelevant = 0;
    let attachmentsProcessed = 0;

    for (const m of messages) {
      if (attachmentsProcessed >= MAX_ATTACHMENTS_PER_SCAN) break;
      if (!m.id) continue;
      if (alreadySeen.has(m.id)) {
        messagesSkippedAlreadySeen++;
        continue;
      }

      const full = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'full',
      });
      const headers = full.data.payload?.headers ?? [];
      const from =
        headers.find((h) => h.name === 'From')?.value ??
        '(mittente sconosciuto)';
      const subject =
        headers.find((h) => h.name === 'Subject')?.value ?? '(nessun oggetto)';
      const dateHeader = headers.find((h) => h.name === 'Date')?.value;
      const emailDate = dateHeader ? new Date(dateHeader) : new Date();

      const attachments = this.extractAttachmentParts(full.data.payload).filter(
        (p) => this.isSupportedAttachment(p.filename),
      );

      for (const part of attachments) {
        if (attachmentsProcessed >= MAX_ATTACHMENTS_PER_SCAN) break;
        if (!part.body?.attachmentId) continue;
        attachmentsProcessed++;

        try {
          const dataRes = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: m.id,
            id: part.body.attachmentId,
          });
          const buffer = Buffer.from(dataRes.data.data ?? '', 'base64url');

          const candidate = await this.documents.createGmailCandidate({
            houseId,
            buffer,
            filename: part.filename,
            gmailMessageId: m.id,
            emailFrom: from,
            emailSubject: subject,
            emailDate,
          });
          if (candidate.ignoredAt) {
            attachmentsIrrelevant++;
          } else {
            candidatesCreated++;
          }
        } catch {
          // Un allegato illeggibile o una singola chiamata Claude fallita
          // non deve interrompere la scansione degli altri: si conta e si
          // va avanti, coerente con "AI propone" — se fallisce, semplicemente
          // non propone nulla per quell'allegato.
          attachmentsFailed++;
        }
      }
    }

    return {
      messagesFound: messages.length,
      messagesSkippedAlreadySeen,
      candidatesCreated,
      attachmentsIrrelevant,
      attachmentsFailed,
      reachedScanCap: attachmentsProcessed >= MAX_ATTACHMENTS_PER_SCAN,
    };
  }

  private extractAttachmentParts(
    payload: gmail_v1.Schema$MessagePart | undefined,
    acc: GmailAttachmentPart[] = [],
  ): GmailAttachmentPart[] {
    if (!payload) return acc;
    if (payload.filename && payload.body?.attachmentId) {
      acc.push({ filename: payload.filename, body: payload.body });
    }
    for (const part of payload.parts ?? []) {
      this.extractAttachmentParts(part, acc);
    }
    return acc;
  }

  private isSupportedAttachment(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop() ?? '';
    return SUPPORTED_EXTENSIONS.includes(ext);
  }
}
