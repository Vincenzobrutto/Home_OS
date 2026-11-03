import {PracticeError,type Source} from './domain';

/** Taxonomy declared in the practice, never a filename guess or a legal assessment. */
export type GiftClassification={
 policyVersion:1;sourceKind:Source['kind'];
 documentKind:'floor_plan'|'ape'|null;family:'property'|'building'|'energy'|'unclassified';
};
export function giftClassification(kind:Source['kind']):GiftClassification{
 const mapped={
  floor_plan:{documentKind:'floor_plan',family:'building'},ape:{documentKind:'ape',family:'energy'},
  deed:{documentKind:null,family:'property'},succession:{documentKind:null,family:'property'},
  cadastral:{documentKind:null,family:'building'},unclassified:{documentKind:null,family:'unclassified'},
  other:{documentKind:null,family:'unclassified'}
 } as const;
 if(typeof kind!=='string'||!Object.hasOwn(mapped,kind))throw new PracticeError('invalid_input');
 return {policyVersion:1,sourceKind:kind,...mapped[kind]};
}
export function parseGiftClassification(input:unknown):GiftClassification{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw new PracticeError('invalid_input');
 const row=input as Record<string,unknown>,keys=Reflect.ownKeys(row);
 if(keys.length!==4||keys.some(k=>typeof k!=='string'||!['policyVersion','sourceKind','documentKind','family'].includes(k)))throw new PracticeError('invalid_input');
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(row,key);if(!d||!('value'in d)||!d.enumerable)throw new PracticeError('invalid_input');}
 const expected=giftClassification(row.sourceKind as Source['kind']);
 if(row.policyVersion!==1||row.documentKind!==expected.documentKind||row.family!==expected.family)throw new PracticeError('invalid_input');
 return expected;
}
