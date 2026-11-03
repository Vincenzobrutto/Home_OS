import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {OriginalMap} from './OriginalMap';
import type {MapTurn} from './orientation';

const initialDecode=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'decode');
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();if(initialDecode)Object.defineProperty(HTMLImageElement.prototype,'decode',initialDecode);else Reflect.deleteProperty(HTMLImageElement.prototype,'decode');});
function raster(width=100,height=100){
 Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:vi.fn().mockResolvedValue(undefined)});
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(width);
 vi.spyOn(HTMLImageElement.prototype,'naturalHeight','get').mockReturnValue(height);
 const drawImage=vi.fn();vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
 class SyntheticURL extends URL{static createObjectURL=vi.fn(()=> 'blob:synthetic-map');static revokeObjectURL=vi.fn();}
 vi.stubGlobal('URL',SyntheticURL);
 return drawImage;
}
describe('original background visibility',()=>{
 it('hides only the raster without rerendering it or changing the overlay and coordinate frame',async()=>{
  const draw=raster(),onPoint=vi.fn(),blob=new Blob(['synthetic']);
  const view=(showOriginal:boolean)=><OriginalMap blob={blob} mime="image/png" page={1} width={100} height={100} showOriginal={showOriginal} onPoint={onPoint} overlay={<a href="#device">Oggetto sintetico</a>}><path d="M0 0H100V100Z"/></OriginalMap>;
  const {rerender}=render(view(true));await screen.findByLabelText('Vani e posizioni sulla mappa');
  const canvas=screen.getByLabelText('Planimetria originale'),svg=screen.getByLabelText('Vani e posizioni sulla mappa'),device=screen.getByRole('link',{name:'Oggetto sintetico'});
  vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:10,top:20,width:200,height:200} as DOMRect);
  expect(canvas).toBeVisible();expect(draw).toHaveBeenCalledOnce();
  rerender(view(false));expect(canvas).not.toBeVisible();expect(canvas).toHaveAttribute('aria-hidden','true');expect(screen.getByLabelText('Vani e posizioni sulla mappa')).toBe(svg);expect(device).toBeVisible();
  fireEvent.click(svg,{clientX:110,clientY:120});expect(onPoint).toHaveBeenCalledWith(50,50);
  rerender(view(true));expect(screen.getByLabelText('Planimetria originale')).toBe(canvas);expect(canvas).toBeVisible();expect(draw).toHaveBeenCalledOnce();
 });
 it('retains the source-frame validation when the original is hidden',async()=>{
  raster(200);render(<OriginalMap blob={new Blob(['synthetic'])} mime="image/png" page={1} width={100} height={100} showOriginal={false} onPoint={vi.fn()} overlay={<a href="#device">Oggetto sintetico</a>}><path d="M0 0H100V100Z"/></OriginalMap>);
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Originale non visualizzabile'));
  expect(screen.queryByLabelText('Vani e posizioni sulla mappa')).not.toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();
 });
 it('rotates a nonsquare page and overlay together while preserving canonical clicks and raster identity',async()=>{
  const draw=raster(200),blob=new Blob(['synthetic']),onPoint=vi.fn();
  const view=(turn:MapTurn,showOriginal=true)=><OriginalMap blob={blob} mime="image/png" page={1} width={200} height={100} turn={turn} showOriginal={showOriginal} onPoint={onPoint} overlay={<a href="#device">Oggetto sintetico</a>}><path d="M40 30H60V50Z"/></OriginalMap>;
  const {rerender}=render(view(0));const svg=await screen.findByLabelText('Vani e posizioni sulla mappa'),canvas=screen.getByLabelText('Planimetria originale');
  const vectors=[{turn:1 as const,x:220,y:140,matrix:'matrix(0 1 -1 0 100 0)'},{turn:2 as const,x:250,y:440,matrix:'matrix(-1 0 0 -1 200 100)'},{turn:3 as const,x:100,y:500,matrix:'matrix(0 -1 1 0 0 200)'}];
  for(const v of vectors){
   rerender(view(v.turn));vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:10,top:20,width:300,height:600} as DOMRect);
   expect(svg.querySelector('g')).toHaveAttribute('transform',v.matrix);fireEvent.click(svg,{clientX:v.x,clientY:v.y});expect(onPoint).toHaveBeenLastCalledWith(40,30);
   expect(screen.getByLabelText('Planimetria originale')).toBe(canvas);expect(canvas).toHaveStyle({transform:'rotate('+v.turn*90+'deg)'});expect(screen.getByRole('link')).toBeVisible();
  }
  rerender(view(1,false));expect(canvas).not.toBeVisible();expect(svg).toHaveAttribute('viewBox','0 0 100 200');expect(svg.parentElement).toHaveStyle({aspectRatio:'100/200'});
  rerender(view(0));expect(canvas).toBeVisible();expect(svg).toHaveAttribute('viewBox','0 0 200 100');expect(draw).toHaveBeenCalledOnce();
 });
 it('frames a cropped source with the same offset matrix as the overlay and inverts rotated clicks',async()=>{
  const draw=raster(1000,800),blob=new Blob(['synthetic']),onPoint=vi.fn(),viewport={x:100,y:200,width:300,height:100};
  const view=(turn:MapTurn,showOriginal=true)=><OriginalMap blob={blob} mime="image/png" page={1} width={1000} height={800} turn={turn} viewport={viewport} showOriginal={showOriginal} onPoint={onPoint}><path d="M160 230H180V250Z"/></OriginalMap>;
  const {rerender}=render(view(1)),svg=await screen.findByLabelText('Vani e posizioni sulla mappa'),canvas=screen.getByLabelText('Planimetria originale') as HTMLCanvasElement;
  expect(canvas.width).toBe(1000);expect(canvas.height).toBe(800);expect(svg).toHaveAttribute('viewBox','0 0 100 300');expect(svg.querySelector('g')).toHaveAttribute('transform','matrix(0 1 -1 0 300 -100)');
  expect(Number.parseFloat(canvas.style.left)).toBe(300);expect(Number.parseFloat(canvas.style.top)).toBeCloseTo(-100/300*100);expect(canvas.style.width).toBe('1000%');expect(Number.parseFloat(canvas.style.height)).toBeCloseTo(800/300*100);
  vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:10,top:20,width:200,height:600} as DOMRect);fireEvent.click(svg,{clientX:150,clientY:140});expect(onPoint).toHaveBeenCalledWith(160,230);
  rerender(view(0,false));expect(svg).toHaveAttribute('viewBox','0 0 300 100');expect(canvas).not.toBeVisible();expect(draw).toHaveBeenCalledOnce();
 });
 it('checks the full source ratio even when a crop happens to match the wrong image',async()=>{
  raster(300,100);render(<OriginalMap blob={new Blob(['synthetic'])} mime="image/png" page={1} width={1000} height={800} viewport={{x:100,y:200,width:300,height:100}} onPoint={vi.fn()}><path d="M160 230H180V250Z"/></OriginalMap>);
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Originale non visualizzabile'));expect(screen.queryByLabelText('Vani e posizioni sulla mappa')).not.toBeInTheDocument();
 });
});
