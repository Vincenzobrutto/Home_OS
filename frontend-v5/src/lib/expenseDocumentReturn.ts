/** Navigation-only context: identifiers are scoped to the originating account/home. */
export function expenseDocumentReturn(state:unknown,accountId:string,homeId:string){
 const value=state as {accountId?:unknown;expenseDocumentReturn?:{homeId?:unknown;documentId?:unknown;documentState?:unknown}}|null;
 const origin=value?.expenseDocumentReturn;
 if(value?.accountId!==accountId||origin?.homeId!==homeId||typeof origin.documentId!=='string'||!/^[A-Za-z0-9_-]+$/.test(origin.documentId))return null;
 return {path:`/home/${encodeURIComponent(homeId)}/documenti/${encodeURIComponent(origin.documentId)}`,state:origin.documentState??null};
}
