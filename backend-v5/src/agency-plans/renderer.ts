import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { inspectAgencyFile } from '../agency-practices/files';
import { assertRaster, type Raster } from './raster';
import type { AgencyPracticesStore } from '../agency-practices/store';
import type { AgencyFileVault } from '../agency-practices/files';
import type { PlanProof } from './pipeline';
import { png } from './provider';
import { PracticeError } from '../agency-practices/domain';
import { PlanError } from './geometry';

export type RenderedPlan = { raster: Raster; pageCount: number; transform: number[]; sourceSHA256: string; rasterSHA256: string; page: number; dpi: number; renderer: 'agency-render-v1' };
export class AgencyPlanRasterizer {
  async render(input: { bytes: Buffer; sha256: string; mimeType: string }, options: { page: number; dpi: number }): Promise<RenderedPlan> {
    const file = inspectAgencyFile(input.bytes);
    if (file.sha256 !== input.sha256 || file.mimeType !== input.mimeType) throw new Error('render_source_changed');
    if (!options || Object.getPrototypeOf(options) !== Object.prototype || Object.keys(options).some(k => !['page','dpi'].includes(k)) || !Number.isSafeInteger(options.page) || options.page < 1 || options.page > 20 || !Number.isSafeInteger(options.dpi) || options.dpi < 72 || options.dpi > 300) throw new Error('render_invalid');
    return new Promise((res, rej) => {
      const child = execFile(process.execPath, ['--max-old-space-size=256', resolve(__dirname, '../../src/agency-plans/render-worker.cjs')], {
        timeout: 15000, maxBuffer: 6 * 1024 * 1024, windowsHide: true,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP },
      }, (error, stdout) => {
        if (error) { rej(new Error('render_process_failed')); return; }
        try {
          const v = JSON.parse(stdout);
          if (v.error) throw new Error(['render_encrypted','render_invalid','render_limits_exceeded','render_media_unsupported'].includes(v.error) ? v.error : 'render_invalid');
          if (typeof v.gray !== 'string' || !Number.isSafeInteger(v.pageCount) || v.pageCount < options.page || v.pageCount > 20 || !Array.isArray(v.transform) || v.transform.length !== 6 || v.transform.some((n: unknown) => typeof n !== 'number' || !Number.isFinite(n))) throw new Error('render_invalid');
          const raster = { width: v.width, height: v.height, gray: Uint8Array.from(Buffer.from(v.gray, 'base64')) }; assertRaster(raster);
          res({ raster, pageCount: v.pageCount, transform: v.transform, sourceSHA256: file.sha256, rasterSHA256: createHash('sha256').update(raster.gray).digest('hex'), page: options.page, dpi: options.dpi, renderer: 'agency-render-v1' });
        } catch (e) { rej(e); }
      });
      child.stdin?.on('error', () => rej(new Error('render_process_failed')));
      child.stdin?.end(JSON.stringify({ bytes: file.bytes.toString('base64'), mimeType: file.mimeType, page: options.page, dpi: options.dpi }));
    });
  }
}

/** Bridge for PlanPorts.loadRaster. Both reads use fresh DB authorization. */
export async function loadAuthorizedPlanRaster(store: AgencyPracticesStore, vault: AgencyFileVault, scope: { accountId: string; agencyId: string; practiceId: string }, proof: PlanProof, dpi: number, renderer = new AgencyPlanRasterizer()) {
  // readFile's DTO intentionally has no page: never pass extra fields to it.
  const selection = { sourceId: proof.sourceId, version: proof.version, sha256: proof.sha256 };
  const current = () => store.readFile(scope.accountId, scope.agencyId, scope.practiceId, selection, vault);
  const file = await current(), result = await renderer.render(file, { page: proof.page, dpi });
  await current(); // Revocation/replacement during decoding discards the raster.
  return result;
}
/** Re-render only the exact pixels used by the analysis; never guess PDF scaling. */
export async function authorizedPlanImage(store:AgencyPracticesStore,vault:AgencyFileVault,scope:{accountId:string;agencyId:string;practiceId:string},id:string){
 const view=await store.readPlans(scope.accountId,scope.agencyId,scope.practiceId),plan=view.plans.find(p=>p.id===id);
 if(!plan)throw new PracticeError('access_denied');
 if(!('rasterSize' in plan))throw new PracticeError('source_changed');
 if(!plan.rendering)throw new PlanError('plan_preview_unavailable');
 const r=await loadAuthorizedPlanRaster(store,vault,scope,plan.proof,plan.rendering.dpi);
 if(r.raster.width!==plan.rasterSize.width||r.raster.height!==plan.rasterSize.height||r.rasterSHA256!==plan.rasterSHA256||r.renderer!==plan.rendering.renderer||JSON.stringify(r.transform)!==JSON.stringify(plan.rendering.transform))throw new PlanError('plan_rendering_changed');
 return png(r.raster);
}
