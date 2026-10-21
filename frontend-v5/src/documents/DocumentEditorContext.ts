import {createContext} from 'react';
export const DocumentEditorContext=createContext<null|{complete:(documentId:string)=>Promise<void>;pause:(saved?:boolean)=>void;showOriginal:()=>void}>(null);
