import {useEffect,useLayoutEffect,useRef,useState} from 'react';

export const MAX_PLAN_ZOOM=6;

export function usePlanZoom<MapElement extends Element=SVGSVGElement>({disabled=false,min=1}={}){
 const [zoom,setZoom]=useState(1);
 const scrollRef=useRef<HTMLDivElement>(null);
 const mapRef=useRef<MapElement>(null);
 const anchor=useRef<{x:number;y:number;clientX:number;clientY:number}|null>(null);

 useLayoutEffect(()=>{
  const position=anchor.current,map=mapRef.current,scroll=scrollRef.current;
  anchor.current=null;
  if(!position||!map||!scroll)return;
  const box=map.getBoundingClientRect();
  scroll.scrollLeft+=box.left+position.x*box.width-position.clientX;
  scroll.scrollTop+=box.top+position.y*box.height-position.clientY;
 },[zoom]);

 useEffect(()=>{
  const scroll=scrollRef.current,map=mapRef.current;
  if(disabled||!scroll||!map)return;
  const wheel=(event:WheelEvent)=>{
   if(event.ctrlKey||event.metaKey||event.deltaY===0||!map.contains(event.target as Node))return;
   const next=Math.min(MAX_PLAN_ZOOM,Math.max(min,zoom+(event.deltaY<0?0.25:-0.25)));
   if(next===zoom)return;
   const box=map.getBoundingClientRect();
   if(!box.width||!box.height)return;
   event.preventDefault();
   anchor.current={x:(event.clientX-box.left)/box.width,y:(event.clientY-box.top)/box.height,clientX:event.clientX,clientY:event.clientY};
   setZoom(next);
  };
  scroll.addEventListener('wheel',wheel,{passive:false});
  return()=>scroll.removeEventListener('wheel',wheel);
 });
 return {zoom,setZoom,scrollRef,mapRef};
}
