import { invoicePageOutput } from './invoice-coverage';
import { FLOOR_PLAN_SCHEMA, FLOOR_PLAN_SYSTEM, floorPlanOutput } from './floor-plan-domain';
import { fileTypeFromBuffer } from 'file-type';
import { Logger } from '@nestjs/common';
import { digest } from '../security';
import { AnthropicTransport, responseData, responseUsage, type PreparedRequest, type ProviderResponse } from '../review/anthropic';
import { PdfTextExtractor, type InputDocument } from '../review/pdf-text';
import { ProviderFailure } from '../review/provider';
import { productExtraction, onboardingLimits, type ProductEvidenceContext } from './domain';
import { DocumentTitleEvidenceFailure } from './understanding';
import { checkImageDimensions } from './image-limits';
import { localPageSelection, ONBOARDING_READING_VERSION, type ReadingMode, type ReadingPlan } from './reading';
import { decodeDiagnostic } from './decode-diagnostic';

import { onboardingSchemaFor, OBJECT_ONBOARDING_SCHEMA } from './provider-schema';
import { onboardingWireOutput } from './provider-wire';
import { OBJECT_ONBOARDING_SYSTEM } from './provider-prompt';
export { OBJECT_ONBOARDING_PROMPT_VERSION, OBJECT_ONBOARDING_SYSTEM } from './provider-prompt';
export { OBJECT_ONBOARDING_SCHEMA, onboardingSchemaFor } from './provider-schema';
export { onboardingWireOutput } from './provider-wire';

export type PreparedProductAnalysis = { request: PreparedRequest; context: ProductEvidenceContext; floorPlan?: boolean; reading?:ReadingPlan };

/** A declaration is archived with the house; technical subjects are not asset proposals. */
function documentScope(value:unknown):unknown {
  if(!value||typeof value!=='object')return value;
  const row=value as Record<string,unknown>;
  if(!Array.isArray(row.documentInfo)||row.documentInfo.length!==1||row.documentInfo[0]?.kind!=='conformity_declaration')return value;
  // Keep unexpected costs and malformed containers visible to the domain validator.
  if(!Array.isArray(row.facts)||row.facts.length>80||!Array.isArray(row.items)||row.items.length>onboardingLimits.maxItems||row.purchaseTotal!=null||row.houseExpenses!==undefined&&(!Array.isArray(row.houseExpenses)||row.houseExpenses.length))return value;
  return {...row,items:[],facts:row.facts.filter(f=>f?.subjectIndex===-1&&['issuer','issuerPhone','issuerEmail','issuerVatId','issuerFiscalId','documentDate'].includes(f.field))};
}

/** Does not dispatch Messages or own a budget. Must remain behind a budgeted worker. */
export class ObjectOnboardingAnthropicProvider {
  private readonly logger = new Logger(ObjectOnboardingAnthropicProvider.name);
  constructor(private readonly parser: PdfTextExtractor, private readonly transport: AnthropicTransport) {}

  async prepare(input: InputDocument & { mimeType: string }, model: string, signal: AbortSignal, authorize: () => Promise<void>, purpose = 'products', options:{mode?:ReadingMode;throughPage?:number}={}): Promise<PreparedProductAnalysis> {
    if (signal.aborted) throw new ProviderFailure('analysis_timeout');
    if (digest(input.bytes) !== input.snapshot.documentSha256) throw new ProviderFailure('storage_unavailable');
    let context: ProductEvidenceContext;
    let messages: PreparedRequest['messages'];
    const mode=options.mode??'full';
    if(!['full','local_pages','progressive'].includes(mode))throw new ProviderFailure('analysis_invalid_output');
    let reading:ReadingPlan={version:ONBOARDING_READING_VERSION,mode,totalPages:1,sentPages:[1]};
    if(purpose==='floor_plan'){
      const pageCount=input.mimeType==='application/pdf'?await this.parser.pageCount(input):1;
      if(!['application/pdf','image/jpeg','image/png'].includes(input.mimeType)||input.bytes.length>5*1024*1024||pageCount>5)throw new ProviderFailure('analysis_limits_exceeded');
      if(input.mimeType!=='application/pdf')checkImageDimensions(input.bytes,input.mimeType as 'image/jpeg'|'image/png');
      const block=input.mimeType==='application/pdf'?{type:'document' as const,source:{type:'base64' as const,media_type:'application/pdf' as const,data:input.bytes.toString('base64')}}:{type:'image' as const,source:{type:'base64' as const,media_type:input.mimeType as 'image/jpeg'|'image/png',data:input.bytes.toString('base64')}};
      await authorize();
      const request=await this.transport.prepareStructured(model,FLOOR_PLAN_SYSTEM,[{role:'user',content:[block,{type:'text',text:'Propose rooms from the dwelling floor plan. Full-page normalized coordinates, top-left origin.'}]}],FLOOR_PLAN_SCHEMA,signal,authorize);
      return {request,context:{kind:'visual_pdf',snapshot:input.snapshot,pageCount},floorPlan:true};
    }
    if (input.mimeType === 'application/pdf') {
      try {
        const [document] = await this.parser.extract([input]);
        const through=options.throughPage??1;
        if(mode==='progressive'&&(!Number.isSafeInteger(through)||through<1||through>document.pages.length))throw new ProviderFailure('analysis_limits_exceeded');
        const sentPages=mode==='local_pages'?localPageSelection(document.pages):document.pages.flatMap((_,i)=>mode!=='progressive'||i<through?[i+1]:[]);
        reading={version:ONBOARDING_READING_VERSION,mode,totalPages:document.pages.length,sentPages};
        context = { kind: 'text', snapshot: document.snapshot, pages: document.pages,allowedPages:sentPages };
        messages = [{ role: 'user', content: JSON.stringify({ pages: document.pages.flatMap((text, index) => sentPages.includes(index+1)?[{page:index+1,text}]:[]) }) }];
      } catch (error) {
        if (!(error instanceof ProviderFailure) || error.code !== 'pdf_text_unavailable') throw error;
        const pageCount = await this.parser.pageCount(input);
        const through=options.throughPage??1;
        if(mode==='progressive'&&(!Number.isSafeInteger(through)||through<1||through>pageCount))throw new ProviderFailure('analysis_limits_exceeded');
        const sentPages=Array.from({length:mode==='progressive'?through:pageCount},(_,i)=>i+1);
        reading={version:ONBOARDING_READING_VERSION,mode,totalPages:pageCount,sentPages};
        context = { kind: 'visual_pdf', snapshot: input.snapshot, pageCount,allowedPages:sentPages };
        if(mode==='progressive'){
          const content:import('../review/anthropic').MessageBlock[]=[];
          for(const page of sentPages){await authorize();const rendered=await this.parser.renderPage(input,page);content.push({type:'text',text:'Physical page '+page+' of '+pageCount+' in the original PDF. Use this physical page number in every citation.'},{type:'image',source:{type:'base64',media_type:'image/png',data:rendered.bytes.toString('base64')}});}
          messages=[{role:'user',content}];
        }else messages = [{ role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.bytes.toString('base64') } }, { type: 'text', text: 'Read this visual PDF. Cite physical pages and visual regions. Do not invent unreadable data.' }] }];
      }
    } else {
      if (!['image/jpeg', 'image/png'].includes(input.mimeType)) throw new ProviderFailure('object_onboarding_unsupported_format');
      if (!input.bytes.length || input.bytes.length > onboardingLimits.maxImageBytes) throw new ProviderFailure('analysis_limits_exceeded');
      const detected = await fileTypeFromBuffer(input.bytes).catch(() => undefined);
      if (detected?.mime !== input.mimeType) throw new ProviderFailure('object_onboarding_invalid_image');
      const mimeType = input.mimeType as 'image/jpeg' | 'image/png';
      checkImageDimensions(input.bytes, mimeType);
      context = { kind: 'image', snapshot: input.snapshot };
      messages = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: input.bytes.toString('base64') } }, { type: 'text', text: 'Identify product rows in this one image. Evidence page is 1. Do not reconstruct cropped or truncated text.' }] }];
    }
    if (signal.aborted) throw new ProviderFailure('analysis_timeout');
    // count_tokens transmits the same image/text: authorization precedes preparation.
    await authorize();
    if (signal.aborted) throw new ProviderFailure('analysis_timeout');
    const schema=onboardingSchemaFor(context.kind,context.kind==='visual_pdf'&&context.pageCount>1?context.allowedPages??Array.from({length:context.pageCount},(_,i)=>i+1):[]);
    const pageInstructions=context.kind==='visual_pdf'&&context.pageCount>1?' Page-addressed invoice coverage: fill EVERY invoicePages slot pN required by the schema for its physical page. For a complete non-utility service invoice on that page use kind=invoice and exactly ONE expenses entry with its own printed supplier, documentNumber, labelled documentDate and current total, all cited on that page. Read each page separately, including the last page; never put both invoices into one entry or merge their totals. For this page-addressed invoice path keep global houseExpenses=[], items=[], facts=[], purchaseTotal=[]. Use kind=unreadable, continuation or other and expenses=[] when a complete invoice cannot be supported; never fabricate it. Other/continuation pages do not prove invoice coverage. Utility bills and product-only documents keep their existing global fields and use other slots. These are proposals for human review, not verified OCR.':'';
    const system=OBJECT_ONBOARDING_SYSTEM.replace(JSON.stringify(OBJECT_ONBOARDING_SCHEMA),JSON.stringify(schema))+pageInstructions+' Wire representation: purchaseTotal, each purchaseAmount and each quantity are arrays with ZERO or ONE element. Use [] instead of null when absent; use [object] when evidenced. Never return multiple elements in these arrays. Citation pool: return sources as an array of {page,excerpt,region}. Every evidence property in documentInfo, facts, product fields, quantity, prices, totals and house expenses is the zero-based integer index of its own source in that array, NOT an inline citation. Reuse an index only when the exact same citation applies. Return at most 256 sources.';
    const request = await this.transport.prepareStructured(model, system, messages, schema, signal, authorize,{cacheFixedInstructions:true});
    return { request, context,reading };
  }

  decode(response: ProviderResponse, prepared: PreparedProductAnalysis) {
    const usage = responseUsage(response, prepared.request.model,true);
    if (usage.input + prepared.request.max_tokens > 50000) throw new ProviderFailure('analysis_limits_exceeded');
    let stage = 'response';
    try {
      const raw = responseData(response);
      if(prepared.floorPlan)return {output:{documentKind:'house_document' as const,items:[],purchaseTotal:null,needsReview:true,floorPlan:floorPlanOutput(raw,prepared.context.kind==='visual_pdf'?prepared.context.pageCount:1)},usage};
      stage = 'wire';
      const paged=invoicePageOutput(raw,prepared.context);
      const normalized = onboardingWireOutput(paged.output); stage = 'evidence';
      const output=productExtraction(documentScope(normalized), {...prepared.context,...(paged.expensePages?{invoiceExpensePages:paged.expensePages}:{})});
      if(!output.paymentReview?.reason&&output.documentKind==='conformity_declaration'&&(normalized as {requiresHumanReview?:boolean}).requiresHumanReview!==true&&output.reviewWarnings?.every(w=>['-1:issuer','-1:documentDate'].includes(w.field)))output.needsReview=false;
      return { output, usage };
    } catch (error) {
      // Shapes and bounded enums only: never log text, titles, excerpts or provider error bodies.
      this.logger.warn(JSON.stringify({ event: 'onboarding_decode_rejected', stage,
        sourceMode: prepared.context.kind, ...decodeDiagnostic(error), ...(error instanceof DocumentTitleEvidenceFailure?{evidenceReason:'document_title'}:{}), stopReason: ['end_turn','max_tokens','refusal'].includes(response.stop_reason) ? response.stop_reason : 'other',
        inputTokens: usage.input, outputTokens: usage.output,
        textCharacters: (Array.isArray(response.content) ? response.content : []).filter(b => b?.type === 'text').reduce((n,b) => n + (typeof b.text === 'string' ? b.text.length : 0),0) }));
      throw error;
    }
  }
}
