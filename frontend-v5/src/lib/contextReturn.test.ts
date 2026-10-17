import { expect,it } from 'vitest';
import {contextReturn} from './contextReturn';
it('keeps the same account/home context and rejects foreign or arbitrary routes',()=>{
 expect(contextReturn({accountId:'a',returnTo:{path:'/home/h/ambienti/room',label:'Cucina'}},'a','h')).toEqual({path:'/home/h/ambienti/room',label:'Cucina'});
 for(const path of ['https://example.test','/home/foreign/ambienti/room','/home/h/ambienti/../account','/home/h/oggetti/object/id?next=elsewhere','/home/h/ambienti/%2fescape'])expect(contextReturn({accountId:'a',returnTo:{path,label:'Invalid'}},'a','h')).toBeNull();
 expect(contextReturn({accountId:'other',returnTo:{path:'/home/h/ambienti/room',label:'Private'}},'a','h')).toBeNull();
});
