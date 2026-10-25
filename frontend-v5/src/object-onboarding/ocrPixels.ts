/** Otsu threshold on the working raster only. Original PDF bytes are never modified. */
export function binarizeOcrPixels(pixels:Uint8ClampedArray){
 const histogram=new Float64Array(256);let total=0,sum=0;
 const gray=(i:number)=>{const alpha=pixels[i+3]!/255;return Math.round(((pixels[i]!*299+pixels[i+1]!*587+pixels[i+2]!*114)/1000)*alpha+255*(1-alpha));};
 for(let i=0;i<pixels.length;i+=4){const value=gray(i);histogram[value]!++;total++;sum+=value;}
 let weight=0,partial=0,best=-1,threshold=127;
 for(let value=0;value<256;value++){
  weight+=histogram[value]!;partial+=value*histogram[value]!;
  if(!weight||weight===total)continue;
  const delta=partial*total-sum*weight,variance=delta*delta/(weight*(total-weight));
  if(variance>best){best=variance;threshold=value;}
 }
 for(let i=0;i<pixels.length;i+=4){const value=gray(i)<=threshold?0:255;pixels[i]=value;pixels[i+1]=value;pixels[i+2]=value;pixels[i+3]=255;}
 return pixels;
}
