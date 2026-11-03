import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {OriginalMap} from './OriginalMap';

const initialDecode=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'decode');
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();if(initialDecode)Object.defineProperty(HTMLImageElement.prototype,'decode',initialDecode);else Reflect.deleteProperty(HTMLImageElement.prototype,'decode');});
function raster(width=100){
 Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:vi.fn().mockResolvedValue(undefined)});
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(width);
 vi.spyOn(HTMLImageElement.prototype,'naturalHeight','get').mockReturnValue(100);
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
});
