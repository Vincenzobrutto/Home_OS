/** Explicit demo/test build only; localhost and ordinary development can contain real data. */
export function documentExamplesEnabled(mode=import.meta.env.MODE){return mode==='demo'||mode==='test';}
