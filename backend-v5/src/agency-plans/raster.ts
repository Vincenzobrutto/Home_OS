import { assert, signedArea, validPolygon, type Point, type Polygon } from './geometry';
export type Raster={width:number;height:number;gray:Uint8Array};
export type SeedSpace={id:string;kind:'room'|'bathroom'|'kitchen'|'corridor'|'balcony'|'excluded';label:string;seeds:Point[]};
export type SymbolRequest={id:string;parentId:string;decision:'include'|'exclude'|'unresolved';reason:string;seeds:Point[]};
export type RasterConfig={version:string;threshold:number;closingRadius:number;minRegionPixels:number;maxRegionFraction:number;simplifyPixels:number;fillTextHolesUpToPixels:number};
export type Region=Polygon&{id:string;label:string;kind:SeedSpace['kind'];seed:Point;component:number;pixelArea:number;symbols:Array<{id:string;status:'included'|'excluded'|'unresolved';reason:string}>};
export type Segmentation={regions:Region[];issues:Array<{id:string;code:string}>;duplicates:Array<{id:string;sameAs:string}>;config:RasterConfig};
export function assertRaster(r:Raster){assert(r&&Number.isInteger(r.width)&&r.width>=8&&r.width<=5000&&Number.isInteger(r.height)&&r.height>=8&&r.height<=5000&&r.width*r.height<=4000000&&r.gray instanceof Uint8Array&&r.gray.length===r.width*r.height);}
type Component={size:number;border:boolean};
function labelsFor(r:Raster,threshold:number){const {width:w,height:h}=r,labels=new Int32Array(w*h),queue=new Int32Array(w*h),components:Component[]=[{size:0,border:true}];let id=0;for(let pos=0;pos<labels.length;pos++){if(labels[pos]||r.gray[pos]<=threshold)continue;id++;let head=0,tail=1,border=false;queue[0]=pos;labels[pos]=id;while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(x===0||y===0||x===w-1||y===h-1)border=true;for(const n of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(n>=0&&!labels[n]&&r.gray[n]>threshold){labels[n]=id;queue[tail++]=n;}}components.push({size:tail,border});}return {labels,components};}
function morph(src:Uint8Array,w:number,h:number,r:number,max:boolean){let a=src;for(const horizontal of [true,false]){const out=new Uint8Array(a.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=max?0:1;for(let d=-r;d<=r;d++){const xx=horizontal?Math.max(0,Math.min(w-1,x+d)):x,yy=horizontal?y:Math.max(0,Math.min(h-1,y+d));if(max)v|=a[yy*w+xx];else v&=a[yy*w+xx];}out[y*w+x]=v;}a=out;}return a;}
const close=(a:Uint8Array,w:number,h:number,r:number)=>r?morph(morph(a,w,h,r,true),w,h,r,false):a;
export function traceMask(mask:Uint8Array,w:number,h:number):Point[][]{
 const edges=new Map<number,number[]>(),stride=w+1,add=(a:number,b:number)=>{const list=edges.get(a)||[];list.push(b);edges.set(a,list);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){const p=y*stride+x;if(!y||!mask[(y-1)*w+x])add(p,p+1);if(x===w-1||!mask[y*w+x+1])add(p+1,p+stride+1);if(y===h-1||!mask[(y+1)*w+x])add(p+stride+1,p+stride);if(!x||!mask[y*w+x-1])add(p+stride,p);}
 const rings:Point[][]=[];while(edges.size){const start=edges.keys().next().value as number,ring:Point[]=[];let p=start;do{ring.push([p%stride,Math.floor(p/stride)]);const next=edges.get(p);assert(next?.length,'raster_topology_unresolved');p=next.pop()!;if(!next.length)edges.delete(ring.at(-1)![1]*stride+ring.at(-1)![0]);assert(ring.length<=mask.length*4,'raster_topology_unresolved');}while(p!==start);if(ring.length>=3)rings.push(ring);}return rings.sort((a,b)=>Math.abs(signedArea(b))-Math.abs(signedArea(a)));
}
function simplifyOpen(p:Point[],eps:number):Point[]{if(p.length<3)return p;const a=p[0],b=p.at(-1)!,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);let max=-1,index=0;for(let i=1;i<p.length-1;i++){const d=len?Math.abs(dx*(p[i][1]-a[1])-dy*(p[i][0]-a[0]))/len:Math.hypot(p[i][0]-a[0],p[i][1]-a[1]);if(d>max){max=d;index=i;}}if(max<=eps)return [a,b];return [...simplifyOpen(p.slice(0,index+1),eps).slice(0,-1),...simplifyOpen(p.slice(index),eps)];}
const simplify=(p:Point[],eps:number)=>{let split=1,max=0;for(let i=1;i<p.length;i++){const d=Math.hypot(p[i][0]-p[0][0],p[i][1]-p[0][1]);if(d>max){max=d;split=i;}}return [...simplifyOpen(p.slice(0,split+1),eps).slice(0,-1),...simplifyOpen([...p.slice(split),p[0]],eps).slice(0,-1)];};
export function segmentPlan(r:Raster,spaces:SeedSpace[],symbols:SymbolRequest[],config:RasterConfig):Segmentation{
 assertRaster(r);
 assert(config&&typeof config.version==='string'&&config.version.trim()&&Number.isInteger(config.threshold)&&config.threshold>=1&&config.threshold<=254&&Number.isInteger(config.closingRadius)&&config.closingRadius>=0&&config.closingRadius<=5&&Number.isInteger(config.minRegionPixels)&&config.minRegionPixels>=1&&Number.isFinite(config.maxRegionFraction)&&config.maxRegionFraction>0&&config.maxRegionFraction<1&&Number.isFinite(config.simplifyPixels)&&config.simplifyPixels>=0&&config.simplifyPixels<=3&&Number.isInteger(config.fillTextHolesUpToPixels)&&config.fillTextHolesUpToPixels>=0&&config.fillTextHolesUpToPixels<=1000);
 assert(Array.isArray(spaces)&&spaces.length<=100&&Array.isArray(symbols)&&symbols.length<=100&&new Set(spaces.map(s=>s.id)).size===spaces.length&&new Set(symbols.map(s=>s.id)).size===symbols.length);
 for(const s of spaces)assert(typeof s.id==='string'&&s.id.trim()&&s.id.length<=100&&typeof s.label==='string'&&s.label.length<=200&&['room','bathroom','kitchen','corridor','balcony','excluded'].includes(s.kind)&&Array.isArray(s.seeds)&&s.seeds.length>=1&&s.seeds.length<=3);
 for(const s of symbols)assert(typeof s.id==='string'&&s.id.trim()&&typeof s.reason==='string'&&s.reason.trim()&&s.reason.length<=1000&&spaces.some(p=>p.id===s.parentId)&&['include','exclude','unresolved'].includes(s.decision)&&Array.isArray(s.seeds)&&s.seeds.length<=8);
 const {width:w,height:h}=r,{labels,components}=labelsFor(r,config.threshold),ownership=new Int16Array(w*h),regions:Region[]=[],issues:Segmentation['issues']=[],duplicates:Segmentation['duplicates']=[],used=new Map<number,string>();
 const componentAt=(p:Point)=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))return 0;const [x,y]=p.map(Math.round);return x>=0&&x<w&&y>=0&&y<h?labels[y*w+x]:0;};
 for(const s of spaces){if(s.kind==='excluded')continue;let component=0,seed:Point|undefined;for(const p of s.seeds){const id=componentAt(p),c=components[id];if(id&&c&&!c.border&&c.size>=config.minRegionPixels&&c.size<=w*h*config.maxRegionFraction){component=id;seed=p;break;}}
  if(!component||!seed){issues.push({id:s.id,code:'seed_region_unresolved'});continue;}const duplicate=used.get(component);if(duplicate){duplicates.push({id:s.id,sameAs:duplicate});if(regions.find(r=>r.id===duplicate)?.kind!==s.kind)issues.push({id:s.id,code:'duplicate_classification_conflict'});continue;}
  let mask:Uint8Array=new Uint8Array(w*h);for(let i=0;i<mask.length;i++)mask[i]=labels[i]===component?1:0;mask=close(mask,w,h,config.closingRadius);const symbolResults:Region['symbols']=[];
  for(const symbol of symbols.filter(v=>v.parentId===s.id)){
   if(symbol.decision==='exclude'){symbolResults.push({id:symbol.id,status:'excluded',reason:symbol.reason});continue;}
   const ids=symbol.seeds.map(componentAt);if(symbol.decision==='unresolved'||!ids.length||ids.some(id=>!id||id===component||components[id].border||components[id].size>config.minRegionPixels*10)){symbolResults.push({id:symbol.id,status:'unresolved',reason:symbol.reason});issues.push({id:symbol.id,code:'symbol_unresolved'});continue;}
   // Explicit include decision: combine selected symbol subregions, never infer X=void/fireplace.
   let minx=w,miny=h,maxx=0,maxy=0;for(let i=0;i<labels.length;i++)if(ids.includes(labels[i])){minx=Math.min(minx,i%w);maxx=Math.max(maxx,i%w);miny=Math.min(miny,Math.floor(i/w));maxy=Math.max(maxy,Math.floor(i/w));}
   if((maxx-minx)*(maxy-miny)>w*h*.02){issues.push({id:symbol.id,code:'symbol_extent_unresolved'});symbolResults.push({id:symbol.id,status:'unresolved',reason:symbol.reason});continue;}
   for(let y=Math.max(0,miny-2);y<=Math.min(h-1,maxy+2);y++)for(let x=Math.max(0,minx-2);x<=Math.min(w-1,maxx+2);x++)mask[y*w+x]=1;mask=close(mask,w,h,config.closingRadius);symbolResults.push({id:symbol.id,status:'included',reason:symbol.reason});
  }
  let rings=traceMask(mask,w,h);if(!rings.length){issues.push({id:s.id,code:'raster_topology_unresolved'});continue;}
  // Text-hole filling is opt-in/configured, defaults are not universal physical rules.
  if(config.fillTextHolesUpToPixels){const holes=rings.slice(1).filter(p=>Math.abs(signedArea(p))<=config.fillTextHolesUpToPixels);for(const p of holes){const minx=Math.min(...p.map(v=>v[0])),maxx=Math.max(...p.map(v=>v[0])),miny=Math.min(...p.map(v=>v[1])),maxy=Math.max(...p.map(v=>v[1]));for(let y=miny;y<maxy;y++)for(let x=minx;x<maxx;x++){// even-odd, small bounded symbol only
      let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])yes=!yes;}if(yes)mask[y*w+x]=1;}}
    if(holes.length)rings=traceMask(mask,w,h);
  }
  const polygon={points:simplify(rings[0],config.simplifyPixels),holes:rings.slice(1).map(p=>simplify(p,config.simplifyPixels))};
  if(!validPolygon(polygon)){issues.push({id:s.id,code:'polygon_unresolved'});continue;}let conflict=false;for(let i=0;i<mask.length;i++)if(mask[i]&&ownership[i]){conflict=true;break;}if(conflict){issues.push({id:s.id,code:'region_overlap'});continue;}
  let pixelArea=0;for(let i=0;i<mask.length;i++)if(mask[i]){ownership[i]=regions.length+1;pixelArea++;}used.set(component,s.id);regions.push({...polygon,id:s.id,label:s.label,kind:s.kind,seed:[...seed],component,pixelArea,symbols:symbolResults});
 }
 return {regions,issues,duplicates,config:structuredClone(config)};
}

