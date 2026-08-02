import { BadRequestException, Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const SUPPORTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

// Tetto per scansione, stesso principio di gmail.service.ts: la cartella è
// già curata dall'utente (niente pre-filtro per parole chiave da fare qui),
// ma un tetto resta comunque utile a limitare la spesa Claude per singola
// scansione se la cartella è molto popolata.
const MAX_FILES_PER_SCAN = 30;

@Injectable()
export class DriveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  private oauthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Integrazione Drive non configurata sul backend (GOOGLE_CLIENT_ID/SECRET/GOOGLE_DRIVE_REDIRECT_URI mancanti in .env).',
      );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(userId: string): string {
    const client = this.oauthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state: userId,
    });
  }

  async handleCallback(code: string, userId: string) {
    const client = this.oauthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const drive = google.drive({ version: 'v3', auth: client });
    const about = await drive.about.get({ fields: 'user' });

    await this.prisma.driveConnection.upsert({
      where: { userId },
      create: {
        userId,
        googleEmail: about.data.user?.emailAddress ?? '',
        accessToken: tokens.access_token ?? '',
        refreshToken: tokens.refresh_token ?? '',
        expiryDate: new Date(tokens.expiry_date ?? Date.now()),
      },
      update: {
        googleEmail: about.data.user?.emailAddress ?? '',
        accessToken: tokens.access_token ?? '',
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiryDate: new Date(tokens.expiry_date ?? Date.now()),
      },
    });
  }

  async getStatus(userId: string) {
    const conn = await this.prisma.driveConnection.findUnique({
      where: { userId },
    });
    if (!conn) return { connected: false as const };
    return {
      connected: true as const,
      email: conn.googleEmail,
      folderId: conn.folderId,
      folderName: conn.folderName,
    };
  }

  async disconnect(userId: string) {
    await this.prisma.driveConnection.deleteMany({ where: { userId } });
  }

  async listFolders(userId: string) {
    const client = await this.getAuthorizedClient(userId);
    const drive = google.drive({ version: 'v3', auth: client });
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      fields: 'files(id,name)',
    });
    return (res.data.files ?? []).map((f) => ({ id: f.id!, name: f.name! }));
  }

  async selectFolder(userId: string, folderId: string, folderName: string) {
    const conn = await this.prisma.driveConnection.findUnique({
      where: { userId },
    });
    if (!conn) {
      throw new BadRequestException(
        'Nessun account Drive collegato per questo utente.',
      );
    }
    await this.prisma.driveConnection.update({
      where: { userId },
      data: { folderId, folderName },
    });
  }

  private async getAuthorizedClient(userId: string) {
    const conn = await this.prisma.driveConnection.findUnique({
      where: { userId },
    });
    if (!conn) {
      throw new BadRequestException(
        'Nessun account Drive collegato per questo utente.',
      );
    }

    const client = this.oauthClient();
    client.setCredentials({
      access_token: conn.accessToken,
      refresh_token: conn.refreshToken,
      expiry_date: conn.expiryDate.getTime(),
    });

    client.on('tokens', (tokens) => {
      void this.prisma.driveConnection.update({
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

  async scan(houseId: string, userId: string) {
    const conn = await this.prisma.driveConnection.findUnique({
      where: { userId },
    });
    if (!conn?.folderId) {
      throw new BadRequestException(
        'Nessuna cartella Drive selezionata: scegli prima una cartella da scansionare.',
      );
    }

    const client = await this.getAuthorizedClient(userId);
    const drive = google.drive({ version: 'v3', auth: client });

    const alreadySeen = await this.documents.driveFileIdsAlreadySeen(houseId);

    const listRes = await drive.files.list({
      q: `'${conn.folderId}' in parents and trashed=false`,
      pageSize: 100,
      fields: 'files(id,name,modifiedTime)',
    });
    const files = (listRes.data.files ?? []).filter(
      (f) => f.id && this.isSupportedFile(f.name ?? ''),
    );

    let candidatesCreated = 0;
    let filesSkippedAlreadySeen = 0;
    let attachmentsIrrelevant = 0;
    let attachmentsFailed = 0;
    let filesProcessed = 0;

    for (const file of files) {
      if (filesProcessed >= MAX_FILES_PER_SCAN) break;
      if (alreadySeen.has(file.id!)) {
        filesSkippedAlreadySeen++;
        continue;
      }
      filesProcessed++;

      try {
        const dataRes = await drive.files.get(
          { fileId: file.id!, alt: 'media' },
          { responseType: 'arraybuffer' },
        );
        const buffer = Buffer.from(dataRes.data as ArrayBuffer);

        const candidate = await this.documents.createDriveCandidate({
          houseId,
          buffer,
          filename: file.name!,
          driveFileId: file.id!,
          driveModifiedAt: file.modifiedTime
            ? new Date(file.modifiedTime)
            : new Date(),
        });
        if (candidate.ignoredAt) {
          attachmentsIrrelevant++;
        } else {
          candidatesCreated++;
        }
      } catch {
        // Stesso principio di gmail.service.ts: un file illeggibile o una
        // chiamata Claude fallita non deve interrompere il resto della
        // scansione — si conta e si va avanti.
        attachmentsFailed++;
      }
    }

    return {
      filesFound: files.length,
      filesSkippedAlreadySeen,
      candidatesCreated,
      attachmentsIrrelevant,
      attachmentsFailed,
      reachedScanCap: filesProcessed >= MAX_FILES_PER_SCAN,
    };
  }

  private isSupportedFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop() ?? '';
    return SUPPORTED_EXTENSIONS.includes(ext);
  }
}
