// Not registered in AuthModule: activation requires the recovery contract and a verified sender.
import { isEmail } from 'class-validator';

export type RecoveryMailPurpose = 'reset_password' | 'verify_email';
export type GiftRegistrationMail = { invitationId: string; secret: string; proof: string };
export type RecoveryMailConfig = { enabled: boolean; apiKey: string; senderEmail: string; senderName: string; publicOrigin: string; allowLocalLinks?: boolean };
export class RecoveryMailFailure extends Error {
  constructor(readonly code: 'mail_disabled' | 'mail_config_invalid' | 'mail_input_invalid' | 'mail_rejected' | 'mail_rate_limited' | 'mail_delivery_uncertain') { super(code); }
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export class BrevoRecoveryMail {
  constructor(private readonly config: RecoveryMailConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  send(purpose: RecoveryMailPurpose, recipient: string, token: string): Promise<{ messageId: string }>;
  send(purpose: 'gift_registration', recipient: string, gift: GiftRegistrationMail): Promise<{ messageId: string }>;
  async send(purpose: RecoveryMailPurpose | 'gift_registration', recipient: string, credential: string | GiftRegistrationMail): Promise<{ messageId: string }> {
    const c = this.config;
    if (!c.enabled) throw new RecoveryMailFailure('mail_disabled');
    let origin: URL;
    try { origin = new URL(c.publicOrigin); } catch { throw new RecoveryMailFailure('mail_config_invalid'); }
    const localLink = c.allowLocalLinks === true && origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname) && origin.port === '5174';
    if (!c.apiKey.trim() || !isEmail(c.senderEmail) || !c.senderName.trim() || c.senderName.length > 100 || /[\r\n]/.test(c.senderName) || origin.protocol !== 'https:' && !localLink || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new RecoveryMailFailure('mail_config_invalid');
    if (!isEmail(recipient)) throw new RecoveryMailFailure('mail_input_invalid');
    const validToken = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
    let title: string, link: URL, instruction: string, action: string;
    if (purpose === 'gift_registration') {
      if (!credential || typeof credential !== 'object' ||
          typeof credential.invitationId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(credential.invitationId) ||
          !validToken(credential.secret) || !validToken(credential.proof)) throw new RecoveryMailFailure('mail_input_invalid');
      title = 'Crea il tuo account Dimora per la Gift';
      instruction = 'Apri il collegamento per scegliere la password del tuo account e ricevere la Gift.';
      action = 'Crea il tuo account';
      link = new URL('/gift/' + credential.invitationId, origin);
      link.hash = new URLSearchParams({ token: credential.secret, signup: credential.proof }).toString();
    } else {
      if (!['reset_password', 'verify_email'].includes(purpose) || !validToken(credential)) throw new RecoveryMailFailure('mail_input_invalid');
      const reset = purpose === 'reset_password';
      title = reset ? 'Reimposta la password di Dimora' : 'Verifica il tuo indirizzo email per Dimora';
      instruction = reset ? 'Apri il collegamento per scegliere una nuova password.' : 'Apri il collegamento per confermare questo indirizzo email.';
      action = reset ? 'Scegli una nuova password' : 'Verifica indirizzo email';
      link = new URL(reset ? '/recupera-password' : '/verifica-email', origin);
      link.hash = new URLSearchParams({ token: credential }).toString();
    }
    const footer = 'Se non hai richiesto questa operazione, ignora questa email. Non rispondere con password o documenti.';
    let response: Response;
    try {
      response = await this.fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { 'api-key': c.apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { email: c.senderEmail, name: c.senderName }, to: [{ email: recipient }], subject: title,
          textContent: `${title}\n\n${instruction}\n${link.href}\n\n${footer}`,
          htmlContent: `<h1>${title}</h1><p>${instruction}</p><p><a href="${escapeHtml(link.href)}">${action}</a></p><p>${footer}</p>` }),
      });
    } catch { throw new RecoveryMailFailure('mail_delivery_uncertain'); }
    // A timeout or server failure may follow acceptance. The caller must reconcile,
    // not blindly retry or create another challenge as if delivery were impossible.
    if (response.status === 429) throw new RecoveryMailFailure('mail_rate_limited');
    if (response.status >= 500 || response.ok && response.status !== 201) throw new RecoveryMailFailure('mail_delivery_uncertain');
    if (response.status !== 201) throw new RecoveryMailFailure('mail_rejected');
    try {
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || !('messageId' in body) || typeof body.messageId !== 'string' || !body.messageId || body.messageId.length > 500) throw new Error();
      return { messageId: body.messageId };
    } catch { throw new RecoveryMailFailure('mail_delivery_uncertain'); }
  }
}
