import { ANALYSIS_LIMITS, PdfTextExtractor } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { PracticeError } from './domain';
import { inspectAgencyFile, type AgencyFileVault } from './files';
import type { AgencyPracticesStore } from './store';
import type { TrustedDeedText } from './deed-extraction';

type Selection = { sourceId:string; version:number; sha256:string };
type File = Selection & { bytes:Buffer; mimeType:string };
/** Local parser only: no provider, OCR, Home snapshot or automatic facts. */
export class AgencyDeedTextDecoder {
  constructor(private readonly parser:Pick<PdfTextExtractor,'parse'> = new PdfTextExtractor()) {}
  async decode(input:File):Promise<TrustedDeedText> {
    if(typeof input.sourceId!=='string'||!input.sourceId.trim()||input.sourceId.length>100||!Number.isSafeInteger(input.version)||input.version<1||typeof input.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(input.sha256)) throw new PracticeError('invalid_input');
    if(!Buffer.isBuffer(input.bytes)||input.bytes.length>ANALYSIS_LIMITS.maxFileBytes) throw new ProviderFailure('analysis_limits_exceeded');
    const selection={sourceId:input.sourceId,version:input.version,sha256:input.sha256},file=inspectAgencyFile(input.bytes);
    if(file.sha256!==selection.sha256) throw new PracticeError('source_changed');
    if(file.mimeType!=='application/pdf'||input.mimeType!==file.mimeType) throw new ProviderFailure('deed_media_unsupported');
    // inspectAgencyFile owns a copy before parse awaits; caller mutations cannot
    // change the bytes whose digest was authorized.
    const pages=await this.parser.parse(file.bytes);
    if(!Array.isArray(pages)||!pages.length||pages.length>ANALYSIS_LIMITS.maxTotalPages) throw new ProviderFailure('analysis_limits_exceeded');
    if(pages.some(p=>typeof p!=='string'||!p.trim())) throw new ProviderFailure('pdf_text_unavailable');
    if(pages.reduce((n,p)=>n+Array.from(p).length,0)>ANALYSIS_LIMITS.maxExtractedCodePoints) throw new ProviderFailure('analysis_limits_exceeded');
    return {...selection,parserVersion:'agency-pdf-text-v1',pages:pages.map((text,i)=>({page:i+1,text}))};
  }
}

/** Fresh store authorization before and after the disposable decoder process. */
export async function loadAuthorizedDeedText(store:Pick<AgencyPracticesStore,'readFile'>,vault:AgencyFileVault,scope:{accountId:string;agencyId:string;practiceId:string},selection:Selection,decoder:Pick<AgencyDeedTextDecoder,'decode'>=new AgencyDeedTextDecoder()) {
  const capturedScope={accountId:scope.accountId,agencyId:scope.agencyId,practiceId:scope.practiceId};
  const selected={sourceId:selection.sourceId,version:selection.version,sha256:selection.sha256};
  const current=()=>store.readFile(capturedScope.accountId,capturedScope.agencyId,capturedScope.practiceId,selected,vault);
  const file=await current(),result=await decoder.decode({...file,...selected});
  await current();
  if(result.sourceId!==selected.sourceId||result.version!==selected.version||result.sha256!==selected.sha256) throw new PracticeError('source_changed');
  return result;
}
