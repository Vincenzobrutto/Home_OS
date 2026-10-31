import {assertRaster,type Raster,type RasterConfig,type SeedSpace} from './raster';

/** Optical candidate only. Derive a local histogram from the census, never an expected room count.
 * The original pixels and requested profile remain unchanged. */
export function proposeInkThreshold(r:Raster,spaces:SeedSpace[],config:RasterConfig){
 assertRaster(r);const eligible=spaces.filter(v=>v.kind!=='excluded');if(eligible.length<3)return null;
 const points=eligible.flatMap(v=>v.seeds).filter(p=>p.every(Number.isFinite)&&p[0]>=0&&p[1]>=0&&p[0]<r.width&&p[1]<r.height);if(points.length<3)return null;
 const pad=Math.ceil(Math.hypot(r.width,r.height)*.08),x0=Math.max(0,Math.floor(Math.min(...points.map(v=>v[0]))-pad)),x1=Math.min(r.width-1,Math.ceil(Math.max(...points.map(v=>v[0]))+pad)),y0=Math.max(0,Math.floor(Math.min(...points.map(v=>v[1]))-pad)),y1=Math.min(r.height-1,Math.ceil(Math.max(...points.map(v=>v[1]))+pad)),histogram=new Uint32Array(246);let samples=0;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const v=r.gray[y*r.width+x];if(v<=245){histogram[v]++;samples++;}}
 if(samples<100)return null;let accumulated=0,quantile=0;for(let i=0;i<histogram.length;i++){accumulated+=histogram[i];if(accumulated>=samples*.9){quantile=i;break;}}
 const threshold=Math.max(config.threshold,Math.min(245,quantile+4));if(threshold-config.threshold<15)return null;
 return {originalThreshold:config.threshold,proposedThreshold:threshold,rule:'census-roi-nonwhite-p90-plus4-v1' as const,samples,requiresReview:true as const};
}
