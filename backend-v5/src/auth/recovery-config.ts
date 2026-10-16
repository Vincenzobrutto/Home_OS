import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isEmail } from 'class-validator';
import type { RecoveryMailConfig } from './recovery-mail';
export type RecoverySettings = RecoveryMailConfig & { throttleSecret: string };
@Injectable()
export class RecoveryConfig {
  protected get raw(): unknown {
    try { return JSON.parse(readFileSync(resolve(__dirname, '../../recovery-mail.local.json'), 'utf8').replace(/^\uFEFF/,'')); } catch { return null; }
  }
  settings(): RecoverySettings {
    const c = this.raw as Partial<RecoverySettings> | null;
    let url: URL | null = null; try { url = new URL(c?.publicOrigin || ''); } catch { /* Unconfigured is disabled. */ }
    const local = c?.allowLocalLinks === true && url?.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '5174';
    if (c?.enabled !== true || typeof c.apiKey !== 'string' || !c.apiKey.trim() || typeof c.senderEmail !== 'string' || !isEmail(c.senderEmail) || typeof c.senderName !== 'string' || !c.senderName.trim() || c.senderName.length > 100 || /[\r\n]/.test(c.senderName) || typeof c.throttleSecret !== 'string' || !/^[a-f0-9]{64}$/.test(c.throttleSecret) || !url || url.protocol !== 'https:' && !local || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new ServiceUnavailableException({ code: 'recovery_unavailable', message: 'Il recupero dell’accesso non è ancora disponibile. Riprova più tardi.' });
    return c as RecoverySettings;
  }
  enabled() { try { this.settings(); return true; } catch { return false; } }
}
