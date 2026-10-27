import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Nessun server avviato: tutte le risposte browser sono asset locali; API solo in memoria.
const project=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.url),args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){
  if(!['--playwright-module','--chrome','--output'].includes(args[i])||!args[i+1])throw Error('Opzioni: --playwright-module <modulo locale> --chrome <eseguibile locale> --output <cartella>');
  options[args[i]]=args[i+1];
}
const {chromium}=require(options['--playwright-module']??'playwright');
const {cleanEnvironment}=require('../../backend-v5/test/offline-policy.cjs');
const env=cleanEnvironment(process.env,'unit');
const output=options['--output']?path.resolve(options['--output']):fs.mkdtempSync(path.join(os.tmpdir(),'dimora-spese-browser-'));
fs.mkdirSync(output,{recursive:true});
const dist=path.join(output,'dist'),log=fs.openSync(path.join(output,'build.log'),'w');
const vite=path.join(path.dirname(require.resolve('vite/package.json')),'bin/vite.js');
const build=spawnSync(process.execPath,[vite,'build','--config',path.join(project,'tests/browser/spese/vite.config.ts'),'--outDir',dist],{cwd:project,env,windowsHide:true,stdio:['ignore',log,log]});
fs.closeSync(log);
if(build.status!==0)throw Error(`Build harness fallita: ${path.join(output,'build.log')}`);
const origin='http://127.0.0.1:5197',prefix='/spese-browser/',reports=[];
for(const width of [1440,873,390,320]){
  const requests=[],denied=[],errors=[];
  const context=await chromium.launchPersistentContext(path.join(output,'profiles',`${width}-${randomUUID()}`),{
    ...(options['--chrome']?{executablePath:options['--chrome']}:{}),headless:true,chromiumSandbox:true,
    env,viewport:{width,height:width<=390?844:1024},isMobile:width<=390,hasTouch:width<=390,
    locale:'it-IT',timezoneId:'Europe/Rome',serviceWorkers:'block',
    args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run'],
  });
  try{
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url()),relative=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html';
      const file=path.resolve(dist,relative);
      if(url.origin!==origin||!url.pathname.startsWith(prefix)||!['GET','HEAD'].includes(request.method())||!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
        denied.push({url:url.href,method:request.method()});return route.abort();
      }
      requests.push(url.href);
      return route.fulfill({status:200,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream',headers:{'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"},body:fs.readFileSync(file)});
    });
    const page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+prefix+'index.html',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:/settembre 2026: 644,30/}).waitFor();
    const start=await page.evaluate(()=>window.speseMock.backend.log.length);
    const trend=page.getByRole('region',{name:'Andamento per mese'});
    const months=()=>trend.getByRole('button',{name:/Apri dettaglio del mese/});
    const details=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Acquisti e interventi · dettaglio del confronto'})});
    const initialListTop=await page.locator('#spese-elenco').evaluate(e=>e.getBoundingClientRect().top+scrollY);
    assert.equal(await months().count(),3);
    assert.equal(await page.getByRole('img',{name:/Grafico ad anello/}).isVisible(),true);
    await page.screenshot({path:path.join(output,`${width}-initial.png`),fullPage:true});
    if(width<=390)assert.ok(initialListTop<1100,`Elenco troppo lontano: ${initialListTop}px`);
    const rowOverflow=await page.evaluate(()=>Array.from(document.querySelectorAll('ul[aria-label="Costi registrati"]>li')).flatMap(row=>{
      const limit=row.getBoundingClientRect().right;
      return Array.from(row.querySelectorAll('*')).filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>limit+1).map(e=>({tag:e.tagName,right:e.getBoundingClientRect().right,limit}));
    }));
    assert.deepEqual(rowOverflow,[]);
    const original=await page.evaluate(()=>({key:window.speseMock.router.state.location.key,search:window.speseMock.router.state.location.search}));
    await trend.getByRole('button',{name:'Mostra mesi del periodo'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-expense-month]').length===10);
    const scroll=trend.locator('[aria-label="Mesi del periodo, scorri orizzontalmente"]');
    await page.waitForFunction(()=>document.querySelector('[aria-label="Mesi del periodo, scorri orizzontalmente"]')?.scrollLeft>0);
    assert.equal(await scroll.evaluate(e=>Math.abs(e.scrollWidth-e.clientWidth-e.scrollLeft)<2),true);
    assert.equal(await page.evaluate(()=>window.speseMock.router.state.location.search),original.search);
    await trend.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${width}-expanded.png`)});
    await trend.getByRole('button',{name:'Mostra ultimi 3 mesi'}).click();
    const september=page.getByRole('button',{name:/settembre 2026: 644,30/});await september.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>window.speseMock.router.state.location.search.includes('mese=2026-09'));
    await page.getByRole('region',{name:'Acquisti e interventi'}).waitFor();
    assert.equal(await months().count(),3);assert.equal(await september.getAttribute('aria-pressed'),'true');
    const firstDrillKey=await page.evaluate(()=>window.speseMock.router.state.location.key);
    await september.click();assert.equal(await page.evaluate(()=>window.speseMock.router.state.location.key),firstDrillKey);
    await page.screenshot({path:path.join(output,`${width}-drill.png`),fullPage:true});
    await page.evaluate(()=>window.speseMock.router.navigate(-1));
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-expense-month')==='2026-09');
    assert.equal(await page.evaluate(()=>window.speseMock.router.state.location.key),original.key);
    assert.equal(await details.getAttribute('open'),null);
    await trend.getByRole('button',{name:'Mostra mesi del periodo'}).click();
    await page.getByRole('combobox',{name:'Gruppo di spesa'}).selectOption('utilities');
    await page.getByRole('button',{name:/settembre 2026: 145,30/}).waitFor();
    assert.equal(await months().count(),10);
    assert.equal(await trend.getByRole('button',{name:'Mostra ultimi 3 mesi'}).getAttribute('aria-expanded'),'true');
    await trend.getByRole('button',{name:'Mostra ultimi 3 mesi'}).click();
    await page.getByRole('button',{name:/settembre 2026: 145,30/}).click();
    await page.locator('summary').filter({hasText:/^Filtri/}).click();
    await page.getByRole('combobox',{name:'Categoria',exact:true}).selectOption('internet_services');
    await page.getByRole('button',{name:'Applica filtri'}).click();
    await page.getByRole('button',{name:/settembre 2026: 32,90/}).waitFor();
    assert.match(await page.locator('[aria-labelledby="spese-totale"]').innerText(),/32,90/);
    assert.equal(await page.locator('ul[aria-label="Costi registrati"]>li:has(a[id^="expense-"])').count(),1);
    await page.screenshot({path:path.join(output,`${width}-filters.png`),fullPage:true});
    await page.evaluate(()=>window.speseMock.router.navigate(`/home/${window.speseMock.homeId}/spese?dal=2025-02-01&al=2025-02-28`));
    await page.getByRole('button',{name:/febbraio 2025: 20,00 €; anno precedente: 15,00 €/}).waitFor();
    await page.getByText(/il 29 febbraio è escluso/).waitFor();
    await trend.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${width}-february.png`)});
    await page.evaluate(()=>window.speseMock.router.navigate(`/home/${window.speseMock.homeId}/spese?famiglia=utilities`));
    await page.getByRole('button',{name:/settembre 2026: 145,30/}).waitFor();
    await page.evaluate(()=>window.speseMock.failMonthly(503));await trend.getByText('Andamento non disponibile').waitFor();
    assert.equal(await months().count(),0);
    await page.screenshot({path:path.join(output,`${width}-503.png`)});
    await page.evaluate(()=>window.speseMock.failMonthly(null));
    await page.getByRole('button',{name:/settembre 2026: 145,30/}).waitFor();
    await page.evaluate(()=>window.speseMock.failMonthly(403));await trend.getByText('Andamento non disponibile').waitFor();
    assert.equal(await months().count(),0);assert.equal(await trend.getByRole('button',{name:/Riprova/}).count(),0);
    await page.screenshot({path:path.join(output,`${width}-403.png`)});
    const writes=await page.evaluate(start=>window.speseMock.backend.log.slice(start).filter(r=>r.method!=='GET'),start);
    assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.deepEqual(denied,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    const report={width,initialListTop,rowOverflow,requests:requests.length,denied,errors,writes,passed:true};reports.push(report);
    fs.writeFileSync(path.join(output,`${width}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }catch(error){
    const page=context.pages()[0];
    if(page)await page.screenshot({path:path.join(output,`${width}-failure.png`),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(output,`${width}-failure.json`),JSON.stringify({width,error:String(error),denied,errors},null,2));
    throw error;
  }finally{await context.close();}
}
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(reports,null,2));
console.log(`Collaudo solo mock completato. Artefatti: ${output}`);
