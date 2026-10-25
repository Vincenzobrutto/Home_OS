import {expect,it} from 'vitest';
import {binarizeOcrPixels} from './ocrPixels';
it('separates dark text from white and tinted backgrounds without modifying the source bytes',()=>{
 const original=new Uint8ClampedArray([0,0,0,255,10,10,10,255,200,220,160,255,255,255,255,255]);
 const copy=original.slice();expect([...binarizeOcrPixels(copy)]).toEqual([0,0,0,255,0,0,0,255,255,255,255,255,255,255,255,255]);expect(original[8]).toBe(200);
});
it('treats transparent pixels as white and leaves empty input empty',()=>{expect([...binarizeOcrPixels(new Uint8ClampedArray([0,0,0,0]))]).toEqual([255,255,255,255]);expect(binarizeOcrPixels(new Uint8ClampedArray())).toHaveLength(0);});
