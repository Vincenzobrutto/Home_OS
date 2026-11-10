import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {emptyProfile,type Profile} from './journey';

export type MandateReading={profile:Profile;pages:Partial<Record<keyof Profile,number>>;warning:string};
const patterns:Partial<Record<keyof Profile,RegExp>>={
 seller:/^(?:venditore|proprietario|conferente)\s*[:–-]\s*(.{3,180})$/im,
 email:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
 phone:/^(?:telefono|cellulare|tel\.)\s*[:–-]\s*([+\d ()-]{6,30})$/im,
 address:/^(?:indirizzo(?: immobile)?|immobile sito in)\s*[:–-]\s*(.{5,180})$/im,
 cadastral:/^(?:dati catastali|identificativi catastali)\s*[:–-]\s*(.{5,180})$/im,
 accessories:/^(?:pertinenze)\s*[:–-]\s*(.{3,180})$/im,
 askingPrice:/^(?:prezzo richiesto|prezzo di vendita)\s*[:–-]\s*([\d., €]{2,40})$/im,
 mandateStart:/^(?:inizio incarico|data inizio)\s*[:–-]\s*(.{5,30})$/im,
 mandateEnd:/^(?:scadenza incarico|data scadenza)\s*[:–-]\s*(.{5,30})$/im,
 commission:/^(?:provvigione(?: venditore)?)\s*[:–-]\s*(.{2,90})$/im,
 exclusive:/^(?:esclusiva)\s*[:–-]\s*(s[iì]|no)\b/im,
};
/** Conservative local proposals from native text, bounded and never sent to an external model. */
export async function readMandate(file:File,signal:AbortSignal):Promise<MandateReading>{
 if(file.size>20*1024*1024)throw Error('file_too_large');
 const lib=await import('pdfjs-dist');
 lib.GlobalWorkerOptions.workerSrc=workerUrl;
 const task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/'});
 const stop=()=>{void task.destroy();};
 signal.addEventListener('abort',stop,{once:true});
 const timer=setTimeout(stop,15000);
 try{
  const pdf=await task.promise;
  if(signal.aborted||pdf.numPages>20)throw Error('limits');
  const profile=emptyProfile(),pages:MandateReading['pages']={};
  const values=new Map<keyof Profile,Set<string>>();
  let total=0;
  for(let number=1;number<=pdf.numPages;number++){
   if(signal.aborted)throw Error('cancelled');
   const page=await pdf.getPage(number),content=await page.getTextContent();
   const text=content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');
   total+=text.length;if(total>100000)throw Error('limits');
   for(const [field,pattern] of Object.entries(patterns) as Array<[keyof Profile,RegExp]>){
    // Conflicting occurrences remain blank for an explicit human decision.
    const matches=text.matchAll(new RegExp(pattern.source,pattern.flags+'g'));
    for(const match of matches){
     const value=(match[1]||match[0]).trim(),prior=values.get(field)??new Set<string>();
     prior.add(value);values.set(field,prior);
     if(prior.size===1){profile[field]=value;pages[field]=number;}else{profile[field]='';delete pages[field];}
    }
   }
  }
  return {profile,pages,warning:total<30?'Il PDF sembra una scansione. Compila i dati per continuare.':'Lettura locale del testo. Controlla i dati proposti e completa quelli mancanti.'};
 }finally{clearTimeout(timer);signal.removeEventListener('abort',stop);await task.destroy();}
}
