import {describe,it,expect} from 'vitest';
import {appendPoint,type Plan} from './model';
describe('floor-plan numbering',()=>{it('keeps point five and its name aligned after exclusions and renames',()=>{
 let plan:Plan={points:[],view:{page:1,x:0,y:0,width:1,height:1},warnings:[]};
 for(let i=0;i<5;i++)plan=appendPoint(plan,.1*i,.3);
 expect(plan.points[4]).toMatchObject({number:5,name:'Ambiente 5'});
 plan.points[1]!.included=false;plan.points[4]!.name='Studio';plan=appendPoint(plan,.6,.3);
 expect(plan.points.map(p=>p.number)).toEqual([1,2,3,4,5,6]);expect(plan.points[5]!.name).toBe('Ambiente 6');
 });});
