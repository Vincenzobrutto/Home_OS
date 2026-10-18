export type ContactValues={name:string;profession:string|null;kind:'person'|'company';phone:string|null;email:string|null;fiscalId:string|null;note:string|null};
export type Contact=ContactValues&{id:string;homeId:string;state:'active'|'archived';version:number;permissions:string[]};
export type Resource={kind:'document'|'object'|'boiler'|'expense'|'work'|'activity';id:string};
export type ContactLink={id:string;resource:Resource;name:string;href:string};
export type ContactPage={items:Contact[];nextCursor:string|null};
