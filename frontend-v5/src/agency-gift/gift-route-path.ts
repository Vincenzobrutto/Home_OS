import {matchRoutes,type RouteObject} from 'react-router';
const giftRoute:RouteObject[]=[{path:'/gift/:invitationId'}];
/** Use the router's own path decoding/case rules solely for recognition, never token adoption. */
export function isGiftRoutePath(input:unknown):boolean{
 return typeof input==='string'&&input.startsWith('/')&&matchRoutes(giftRoute,input)!==null;
}
