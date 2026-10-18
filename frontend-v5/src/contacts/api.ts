import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useAccount, useApi } from '../session/session';
import type { Contact, Resource } from './types';
export type { ContactValues, Contact, Resource, ContactLink, ContactPage } from './types';
export const contactBase=(h:string)=>'/homes/'+encodeURIComponent(h)+'/contacts';
export function useContactsQuery<T>(h:string,path:string,enabled=true){const api=useApi(),a=useAccount();return useQuery({enabled,queryKey:['account',a.id,'home',h,'contacts',path],queryFn:({signal})=>api.callJson<T>(path,{accountId:a.id,signal})});}
export function useContactSave(h:string){const api=useApi(),a=useAccount(),qc=useQueryClient(),keys=useRef(new Map<string,string>());return useMutation({mutationFn:({path,body}:{path:string;body:unknown})=>{const signature=JSON.stringify([path,body]);let key=keys.current.get(signature);if(!key){key=crypto.randomUUID();keys.current.set(signature,key);}return api.callJson<{contact:Contact}>(path,{method:'POST',body,idempotencyKey:key,accountId:a.id});},onSuccess:()=>qc.invalidateQueries({queryKey:['account',a.id,'home',h,'contacts']})});}
export const resourceQuery=(r:Resource)=>new URLSearchParams({resourceKind:r.kind,resourceId:r.id}).toString();
