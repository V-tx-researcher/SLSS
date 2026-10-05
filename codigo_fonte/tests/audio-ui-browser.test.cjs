'use strict';
/* Saídas controladas testam a barreira da interface; não a acurácia do modelo. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.SIGILO_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
let browser;
(async()=>{
 const options={headless:true};
 if(process.env.SIGILO_CHROMIUM_PATH){options.executablePath=process.env.SIGILO_CHROMIUM_PATH;options.args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];options.env={...process.env,LD_LIBRARY_PATH:path.dirname(options.executablePath)};}
 browser=await chromium.launch(options);
 const context=await browser.newContext({offline:true}),requests=[],errors=[];
 context.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await context.addInitScript(()=>{
  const NativeWorker=Worker;window.sigiloTestWorkers=[];
  window.Worker=class extends NativeWorker {constructor(...args){super(...args);sigiloTestWorkers.push(this);}};
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.join(root,'SLSS_Offline.html'));
 await page.locator('#motorFile').setInputFiles(fs.existsSync(path.join(root,'Motor_Whisper_Local.sigilo'))?path.join(root,'Motor_Whisper_Local.sigilo'):path.join(root,'../Motor_Whisper_Local.sigilo'));
 await page.locator('#audioStatus').filter({hasText:'Motor local pronto'}).waitFor({timeout:60000});
 await page.evaluate(()=>sigiloTestWorkers.at(-1).dispatchEvent(new MessageEvent('message',{data:{type:'done',text:'O que é '.repeat(160)}})));
 assert.equal(await page.locator('#audioText').inputValue(),'');
 assert(await page.locator('#audioIssue').isVisible());
 assert((await page.locator('#audioIssue').textContent()).includes('repetição excessiva'));
 assert.equal(await page.locator('#audioProgress').evaluate(n=>n.value),0);
 if(process.env.SIGILO_SCREENSHOT)await page.screenshot({path:process.env.SIGILO_SCREENSHOT,fullPage:true});
 await page.locator('#audioReviewed').check();assert(await page.locator('#useTranscript').isDisabled());
 await page.evaluate(()=>sigiloTestWorkers.at(-1).dispatchEvent(new MessageEvent('message',{data:{type:'quality-error',reason:'incomplete',start:20,end:30}})));
 assert((await page.locator('#audioIssue').textContent()).includes('00:20 a 00:30'));
 await page.evaluate(()=>sigiloTestWorkers.at(-1).dispatchEvent(new MessageEvent('message',{data:{type:'done',text:'O que é? O que é? A equipe explicou o atendimento.',retried:1}})));
 assert((await page.locator('#audioText').inputValue()).includes('A equipe explicou'));
 assert((await page.locator('#audioIssue').textContent()).includes('refez 1 trecho'));
 assert(await page.locator('#useTranscript').isDisabled());
 const corrected='Bom dia. O atendimento foi confirmado pela equipe.';
 await page.locator('#audioText').fill(corrected);await page.locator('#audioReviewed').check();
 await page.locator('#useTranscript').click();assert.equal(await page.locator('#sourceText').inputValue(),corrected);
 await page.locator('#clearSession').click();await page.locator('#clearConfirm').click();
 assert.equal(await page.locator('#audioText').inputValue(),'');assert(await page.locator('#audioIssue').isHidden());
 assert(await page.locator('#transcribeButton').isDisabled());
 assert.equal(requests.length,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({browser:browser.version(),offline:true,tests:['repetição não é exibida como transcrição concluída','texto inválido não pode ser transferido por confirmação vazia','trecho interrompido é indicado com horário','repetição legítima curta permanece intacta','nova tentativa é comunicada e depende de revisão','transcrição manual conferida pode ser transferida','limpeza remove aviso, transcrição e motor'],controlledDecoderOutputs:true,httpRequests:requests.length,passed:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
