'use strict';
/* Testes reais do navegador com rede offline. Fixture de áudio fictício. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require(process.env.SIGILO_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const examples=fs.existsSync(path.join(root,'exemplos'))?path.join(root,'exemplos'):path.join(root,'../exemplos');
const audio=process.env.SIGILO_AUDIO_FIXTURE||path.join(examples,'Audio_Ficticio_Portugues.wav');
const model=fs.existsSync(path.join(root,'Motor_Whisper_Local.sigilo'))?path.join(root,'Motor_Whisper_Local.sigilo'):path.join(root,'../Motor_Whisper_Local.sigilo');
let browser,temporary;
const summary=[];
async function ready(page){
  await page.locator('#motorFile').setInputFiles(model);
  await page.waitForFunction(()=>document.getElementById('audioStatus').textContent.startsWith('Motor local pronto'),null,{timeout:15000}).catch(async e=>{throw new Error('Motor: '+await page.locator('#audioStatus').textContent()+'; '+e.message);});
}
(async()=>{
  const options={headless:true};
  if(process.env.SIGILO_CHROMIUM_PATH){
    options.executablePath=process.env.SIGILO_CHROMIUM_PATH;
    options.args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];
    options.env={...process.env,LD_LIBRARY_PATH:path.dirname(options.executablePath)};
  }
  browser=await chromium.launch(options);
  const context=await browser.newContext({viewport:{width:1440,height:1080},offline:true});
  await context.addInitScript(()=>{
    const NativeWorker=Worker;
    globalThis.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('error',e=>console.error('worker error',e.message,e.filename,e.lineno));}};
  });
  const external=[],errors=[];
  context.on('request',r=>{if(/^https?:/i.test(r.url()))external.push(r.url());});
  const page=await context.newPage();
  page.on('pageerror',e=>{errors.push(e.message);console.error('Navegador:',e.message);});
  page.on('console',m=>{if(m.type()==='error')console.error('Console:',m.text().slice(0,400));});
  await page.goto('file://'+path.join(root,'SLSS_Offline.html'));
  await ready(page);
  await page.locator('#audioFile').setInputFiles(audio);
  await page.locator('#transcribeButton').click();
  await page.waitForFunction(()=>document.getElementById('audioStatus').textContent.startsWith('Transcrição concluída'),null,{timeout:180000});
  const transcript=await page.locator('#audioText').inputValue();
  assert(transcript.length>70,'Transcrição obtida: '+JSON.stringify(transcript));
  if(!process.env.SIGILO_AUDIO_FIXTURE)assert(/bom dia/i.test(transcript)&&/reuni/i.test(transcript)&&/social/i.test(transcript),'A transcrição deve reconhecer informações do roteiro fictício: '+transcript);
  summary.push({test:'transcrição real offline',transcript});
  assert(await page.locator('#useTranscript').isDisabled());
  const corrected=process.env.SIGILO_AUDIO_FIXTURE?transcript:fs.readFileSync(path.join(examples,'Roteiro_Audio_Ficticio.txt'),'utf8').split('\n')[0];
  await page.locator('#audioText').fill(corrected);
  assert(await page.locator('#useTranscript').isDisabled());
  await page.locator('#audioReviewed').check();
  await page.locator('#useTranscript').click();
  assert.equal(await page.locator('#sourceText').inputValue(),corrected);
  await page.locator('#scanButton').click();
  await page.waitForFunction(()=>!document.getElementById('generateButton').disabled);
  await page.locator('#generateButton').click();
  assert(await page.locator('#copyProtected').isDisabled());
  await page.locator('#reviewed').check();
  await page.locator('#useProtected').click();
  await page.locator('#checkReturn').click();
  await page.locator('#restoreButton').click();
  assert.equal(await page.locator('#finalText').inputValue(),corrected);
  summary.push({test:'transcrição → revisão → proteção → reinserção',passed:true});
  await page.locator('#clearSession').click();await page.locator('#clearConfirm').click();
  assert((await page.locator('textarea').evaluateAll(items=>items.filter(n=>n.id!=='promptPreview').every(n=>n.value===''))));
  assert(await page.locator('#transcribeButton').isDisabled());
  assert.equal(await page.locator('#audioFile').evaluate(n=>n.files.length),0);
  summary.push({test:'limpeza de áudio, textos e motor',passed:true});
  // Cancelar depois de começar o reconhecimento deve ignorar resultados tardios.
  await ready(page);await page.locator('#audioFile').setInputFiles(audio);
  await page.locator('#transcribeButton').click();
  await page.waitForFunction(()=>document.getElementById('audioStatus').textContent.startsWith('Reconhecendo'));
  await page.locator('#cancelAudio').click();
  assert.equal(await page.locator('#audioText').inputValue(),'');
  assert(await page.locator('#transcribeButton').isDisabled());
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#audioText').inputValue(),'');
  summary.push({test:'cancelamento ignora respostas tardias',passed:true});
  const altered=Buffer.from(fs.readFileSync(model));altered[0]^=1;
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sigilo-motor-test-'));
  const alteredPath=path.join(temporary,'alterado.sigilo');fs.writeFileSync(alteredPath,altered);
  await page.locator('#motorFile').setInputFiles(alteredPath);
  await page.waitForFunction(()=>document.getElementById('audioStatus').textContent.includes('alterado ou está incompleto'));
  assert(await page.locator('#transcribeButton').isDisabled());
  summary.push({test:'motor alterado é rejeitado antes de executar',passed:true});
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  assert.equal(await page.evaluate(()=>sessionStorage.length),0);
  assert.equal(external.length,0);
  assert.equal(errors.length,0,JSON.stringify(errors));
  summary.push({test:'nenhuma requisição HTTP/HTTPS e nenhum dado em Web Storage',passed:true});
  const screenshot=process.env.SIGILO_SCREENSHOT;
  if(screenshot){await page.locator('#clearSession').click();await page.locator('#clearConfirm').click();await page.screenshot({path:screenshot,fullPage:true});}
  console.log(JSON.stringify({browser:browser.version(),offline:true,results:summary},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
