import { expect, it } from 'vitest';
import { houseDocumentType } from './model';
it('house documents stay separate from products, including known and mixed documents',()=>{
 expect(houseDocumentType('planimetria.pdf')).toBe('floor_plan');expect(houseDocumentType('APE_casa.pdf')).toBe('ape');
 expect(houseDocumentType('file.pdf',['floor_plan'])).toBe('floor_plan');expect(houseDocumentType('file.pdf',['ape','cila'])).toBe('ape');
 expect(houseDocumentType('Fattura planimetria.pdf',['invoice'])).toBeNull();expect(houseDocumentType('file.pdf',['floor_plan','invoice'])).toBeNull();
 expect(houseDocumentType('Etichetta.jpg',['product_label'])).toBeNull();
});
