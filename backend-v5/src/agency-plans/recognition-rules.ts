import {assert,type Point} from './geometry';
import {assertRaster,type Raster,type SeedSpace} from './raster';

export type AnnexKind='cellar'|'garage'|'parking'|'attic'|'balcony'|'terrace'|'garden';
/** Lexical evidence proposes a use, never ownership, habitability or a coefficient. */
export function classifyAnnex(text:string,confidence:number){
 assert(typeof text==='string'&&text.length<=1000&&Number.isFinite(confidence)&&confidence>=0&&confidence<=1);
 const s=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const patterns:Array<[AnnexKind,RegExp]>=[['cellar',/\b(?:cantina|cantine|cellar)\b/],['garage',/\b(?:garage|autorimessa|autorimesse|box\s+auto)\b/],['parking',/\b(?:posto\s+auto|posti\s+auto|parking)\b/],['attic',/\b(?:soffitta|sottotetto|attic)\b/],['balcony',/\b(?:balcone|balconi|balconata|balcony)\b/],['terrace',/\b(?:terrazzo|terrazza|terrazzi|terrace)\b/],['garden',/\b(?:giardino|garden)\b/]];
 const matches=patterns.filter(([,p])=>p.test(s)).map(([kind])=>kind),ambiguousBox=/\bbox\b/.test(s)&&!matches.includes('garage');if(ambiguousBox)matches.push('garage');const foreign=/\b(?:altra\s+(?:u\.?\s*i\.?\s*u\.?|unita|proprieta)|common\s+area|common|communal|shared|other\s+(?:unit|property)|parti\s+comuni|cantina\s+comune|uso\s+comune|condominiale)\b/.test(s),negated=/\b(?:non|no|senza|esclus[oa])\s+(?:e\s+)?(?:una?\s+)?(?:cantina|garage|autorimessa|box|posto\s+auto|soffitta|balcone|terrazza|giardino)\b/.test(s);
 return {kind:matches.length===1&&!ambiguousBox&&!negated&&confidence>=.75?matches[0]:null,candidates:matches,status:matches.length===1&&!ambiguousBox&&!negated&&confidence>=.75?'proposed' as const:'needs_review' as const,association:foreign?'other_or_common_to_verify' as const:'unverified' as const,reason:ambiguousBox?'ambiguous_box':negated?'negated_label':matches.length>1?'ambiguous_label':confidence<.75?'low_text_confidence':matches.length?'explicit_label':'no_explicit_label'};
}
export function annexCensus(spaces:SeedSpace[],geometryIds:string[]=[]){assert(Array.isArray(spaces)&&spaces.length<=100);return spaces.map(s=>{const classification=classifyAnnex(s.label,1);return {id:s.id,...classification,reviewExclusion:s.kind==='excluded'&&classification.candidates.length>0,geometryAvailable:geometryIds.includes(s.id)};}).filter(s=>s.candidates.length>0);}

/** Recover only a geometric candidate; raw AI inventory and association remain unconfirmed. */
export function recoverAnnexInventory(spaces:SeedSpace[]):SeedSpace[]{assert(Array.isArray(spaces)&&spaces.length<=100);return spaces.map(s=>{const a=classifyAnnex(s.label,1);return s.kind==='excluded'&&a.kind&&a.association==='unverified'?{...structuredClone(s),kind:a.kind==='balcony'?'balcony' as const:'room' as const}:structuredClone(s);});}

export type OpeningObservation={id:string;start:Point;end:Point;signals:Array<'arrow'|'door_arc'|'door_leaf'|'wall_ends'>;context:'inside_to_common'|'between_rooms'|'unknown';source:'image_detector'|'ai'|'human'};
export type VirtualThreshold=OpeningObservation&{state:'proposed';role:'entrance_candidate'|'internal_door_candidate'|'unclassified_opening';canPreview:boolean;reasons:string[];spanPixels:number};
const dark=(r:Raster,x:number,y:number,threshold:number)=>x>=0&&y>=0&&x<r.width&&y<r.height&&r.gray[Math.round(y)*r.width+Math.round(x)]<=threshold;
function inkNear(r:Raster,p:Point,threshold:number){for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(dark(r,Math.round(p[0])+x,Math.round(p[1])+y,threshold))return true;return false;}
function validPoint(r:Raster,p:Point){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[1]>=0&&p[0]<=r.width-1&&p[1]<=r.height-1;}
/** Evidence is proposed/untrusted. An arrow alone never identifies an entrance. */
export function proposeThresholds(r:Raster,observations:OpeningObservation[],threshold=180):VirtualThreshold[]{
 assertRaster(r);assert(Array.isArray(observations)&&observations.length<=200&&Number.isInteger(threshold)&&threshold>=1&&threshold<=254);
 const seen=new Set<string>();return observations.map(o=>{
  assert(o&&typeof o.id==='string'&&o.id.trim()&&o.id.length<=100&&!seen.has(o.id)&&validPoint(r,o.start)&&validPoint(r,o.end));seen.add(o.id);
  assert(['image_detector','ai','human'].includes(o.source)&&['inside_to_common','between_rooms','unknown'].includes(o.context)&&Array.isArray(o.signals)&&o.signals.length<=4&&o.signals.every(s=>['arrow','door_arc','door_leaf','wall_ends'].includes(s)));
  const span=Math.hypot(o.end[0]-o.start[0],o.end[1]-o.start[1]),reasons:string[]=[];
  if(span<4||span>Math.hypot(r.width,r.height)*.25)reasons.push('implausible_pixel_span');
  if(!inkNear(r,o.start,threshold)||!inkNear(r,o.end,threshold))reasons.push('missing_wall_endpoint');
  let ink=0,samples=0;for(let i=3;i<span-2;i++){samples++;if(dark(r,Math.round(o.start[0]+(o.end[0]-o.start[0])*i/span),Math.round(o.start[1]+(o.end[1]-o.start[1])*i/span),threshold))ink++;}
  if(samples&&ink/samples>.35)reasons.push('crosses_existing_ink');
  if(!o.signals.includes('wall_ends'))reasons.push('wall_ends_not_observed');
  const door=o.signals.some(s=>s==='door_arc'||s==='door_leaf'),role=o.context==='inside_to_common'&&(door||o.signals.includes('arrow'))?'entrance_candidate':o.context==='between_rooms'&&door?'internal_door_candidate':'unclassified_opening';
  if(role==='unclassified_opening')reasons.push('opening_type_unverified');
  // Geometry may be previewed only after explicit user selection, even when its type is unknown.
  return {...structuredClone(o),state:'proposed',role,canPreview:reasons.every(s=>s==='opening_type_unverified'),reasons,spanPixels:span};
 });
}
/** Scan collinear stroke fragments at multiple angles; results are NOT door detections. */
export function detectOpeningGaps(r:Raster,roi:{x:number;y:number;width:number;height:number},options:{threshold?:number;minimumFlankPixels?:number;limit?:number}={}):OpeningObservation[]{
 assertRaster(r);assert(roi&&[roi.x,roi.y,roi.width,roi.height].every(Number.isFinite)&&roi.x>=0&&roi.y>=0&&roi.width>=8&&roi.height>=8&&roi.x+roi.width<=r.width&&roi.y+roi.height<=r.height);
 const threshold=options.threshold??180,flank=options.minimumFlankPixels??8,limit=options.limit??100;assert(Number.isInteger(threshold)&&threshold>=1&&threshold<=254&&Number.isInteger(flank)&&flank>=4&&flank<=30&&Number.isInteger(limit)&&limit>=1&&limit<=200);
 const cx=roi.x+roi.width/2,cy=roi.y+roi.height/2,extent=Math.hypot(roi.width,roi.height)/2,maxGap=Math.hypot(r.width,r.height)*.25,found:Array<{a:Point;b:Point;strength:number}>=[];
 for(let degrees=0;degrees<180;degrees+=15){const angle=degrees*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle);let angleFound=0;for(let offset=-extent;offset<=extent;offset++){let run=0,last:Point|null=null,previous:{end:Point;length:number}|null=null,gap=0;
  const finish=()=>{if(run&&last){if(previous&&run>=flank&&previous.length>=flank&&gap>=5&&gap<=maxGap&&angleFound<250){const b:[number,number]=[last[0]-dx*(run-1),last[1]-dy*(run-1)];found.push({a:previous.end,b,strength:Math.min(previous.length,run)});angleFound++;}previous={end:last,length:run};}run=0;};
  for(let distance=-extent;distance<=extent;distance++){const x=Math.round(cx-dy*offset+dx*distance),y=Math.round(cy+dx*offset+dy*distance);if(x<roi.x||x>=roi.x+roi.width||y<roi.y||y>=roi.y+roi.height){finish();previous=null;gap=0;continue;}if(dark(r,x,y,threshold)){if(!run)last=null;run++;last=[x,y];}else{if(run){finish();gap=0;}gap++;}}finish();
 }}
 const candidates:OpeningObservation[]=[];for(const item of found.sort((a,b)=>b.strength-a.strength)){const mid:Point=[(item.a[0]+item.b[0])/2,(item.a[1]+item.b[1])/2];if(candidates.some(c=>Math.hypot((c.start[0]+c.end[0])/2-mid[0],(c.start[1]+c.end[1])/2-mid[1])<5&&Math.abs(Math.hypot(c.end[0]-c.start[0],c.end[1]-c.start[1])-Math.hypot(item.b[0]-item.a[0],item.b[1]-item.a[1]))<6))continue;const vx=item.b[0]-item.a[0],vy=item.b[1]-item.a[1],length=Math.hypot(vx,vy);let branch=false;for(const end of[item.a,item.b])for(const sign of[-1,1]){let support=0;for(let d=3;d<=8;d++)if(inkNear(r,[end[0]-vy/length*d*sign,end[1]+vx/length*d*sign],threshold))support++;if(support>=4)branch=true;}if(!branch)continue;const o:OpeningObservation={id:'gap-'+(candidates.length+1),start:item.a,end:item.b,signals:['wall_ends'],context:'unknown',source:'image_detector'};if(!validPoint(r,o.start)||!validPoint(r,o.end))continue;if(!proposeThresholds(r,[o],threshold)[0].canPreview)continue;candidates.push(o);if(candidates.length===limit)break;}return candidates;
}
/** Explicit selection changes a temporary segmentation copy, never the original raster. */
export function previewVirtualThresholds(r:Raster,proposals:VirtualThreshold[],selectedIds:string[],threshold=180){
 assertRaster(r);assert(proposals.length<=200&&selectedIds.length<=30&&new Set(selectedIds).size===selectedIds.length);const current=proposeThresholds(r,proposals.map(p=>({id:p.id,start:p.start,end:p.end,signals:p.signals,context:p.context,source:p.source})),threshold);const selected=selectedIds.map(id=>{const p=current.find(s=>s.id===id);assert(p?.canPreview,'threshold_not_supported');return p;});
 const gray=r.gray.slice();let changedPixels=0;for(const p of selected){const steps=Math.ceil(p.spanPixels);for(let i=0;i<=steps;i++){const x=Math.round(p.start[0]+(p.end[0]-p.start[0])*i/steps),y=Math.round(p.start[1]+(p.end[1]-p.start[1])*i/steps),index=y*r.width+x;if(gray[index]>threshold)changedPixels++;gray[index]=0;}}
 return {state:'preview_only' as const,raster:{...r,gray},thresholds:selected,changedPixels,originalUnchanged:true as const,requiresConfirmation:true as const};
}
