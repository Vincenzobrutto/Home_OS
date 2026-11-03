/** Export only the already-built synthetic Gift harness; no server, API or upload. */
import {readFileSync,writeFileSync,realpathSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const frontend=fileURLToPath(new URL('..',import.meta.url));
const cache=path.join(frontend,'.agency-cache'),build=path.join(cache,'gift-build');
if(lstatSync(cache).isSymbolicLink()||lstatSync(build).isSymbolicLink())throw Error('gift_export_requires_private_build');
const root=realpathSync(build);
function builtFile(relative){
 const file=realpathSync(path.join(root,relative));
 if(!file.startsWith(root+path.sep)||!lstatSync(file).isFile())throw Error('gift_export_path_forbidden');
 return readFileSync(file,'utf8');
}
let html=builtFile('agency-gift-preview.html');
const script=html.match(/<script type="module" crossorigin src="\/(assets\/[\w.-]+\.js)"><\/script>/u);
const style=html.match(/<link rel="stylesheet" crossorigin href="\/(assets\/[\w.-]+\.css)">/u);
if(!script||!style)throw Error('gift_export_build_shape_changed');
const js=builtFile(script[1]),css=builtFile(style[1]);
if(/\bimport\s*(?:\(|["'{*])/u.test(js)||/@import/iu.test(css))throw Error('gift_export_external_module_forbidden');
html=html.replace(script[0],()=>'<script type="module">'+js.replace(/<\/script/giu,'<\\/script')+'</script>');
html=html.replace(style[0],()=>'<style>'+css.replace(/<\/style/giu,'<\\/style')+'</style>');
html=html.replace('<meta charset="UTF-8">',`<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`);
if(/<(?:script|link)\b[^>]*(?:src|href)=/iu.test(html))throw Error('gift_export_resource_remaining');
const out=path.join(cache,'gift-preview-standalone.html');
writeFileSync(out,html);
console.log(JSON.stringify({output:out,sha256:createHash('sha256').update(html).digest('hex'),fixtureOnly:true,networkPolicy:'connect-src none',serverStarted:false}));
