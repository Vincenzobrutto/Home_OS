import {expect,it} from 'vitest';
import {documentExamplesEnabled} from './exampleEnvironment';
it('synthetic examples require an explicit test/demo mode, including on localhost',()=>{
 for(const mode of ['development','production','preview','staging',''])expect(documentExamplesEnabled(mode)).toBe(false);
 for(const mode of ['test','demo'])expect(documentExamplesEnabled(mode)).toBe(true);
});
