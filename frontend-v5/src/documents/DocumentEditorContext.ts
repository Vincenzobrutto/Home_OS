import {createContext} from 'react';
export const DocumentEditorContext=createContext<null|{complete:(documentId:string)=>Promise<void>;pause:()=>void;showOriginal:()=>void}>(null);
