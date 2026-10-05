'use strict';
/* Simula uma incorporação com sandbox. Não é um teste no Wix real. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require(process.env.SIGILO_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
let browser,temporary;
(async()=>{
  const options={headless:true};
  if(process.env.SIGILO_CHROMIUM_PATH){options.executablePath=process.env.SIGILO_CHROMIUM_PATH;options.args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];options.env={...process.env,LD_LIBRARY_PATH:path.dirname(options.executablePath)};}
  browser=await chromium.launch(options);
  const context=await browser.newContext({offline:true});
  const requests=[],errors=[];context.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sigilo-iframe-'));
  const encode=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const source=fs.readFileSync(path.join(root,'SLSS_Wix.html'),'utf8');
  const parent=path.join(temporary,'iframe.html');
  fs.writeFileSync(parent,'<!doctype html><iframe id="app" sandbox="allow-scripts allow-same-origin" srcdoc="'+encode(source)+'"></iframe><script>window.messages=[];addEventListener("message",e=>messages.push(e.data));</script>');
  await page.goto('file://'+parent);
  const frame=await page.locator('#app').contentFrame();
  await frame.locator('#motorFile').setInputFiles(fs.existsSync(path.join(root,'Motor_Whisper_Local.sigilo'))?path.join(root,'Motor_Whisper_Local.sigilo'):path.join(root,'../Motor_Whisper_Local.sigilo'));
  await frame.locator('#audioStatus').filter({hasText:'Motor local pronto'}).waitFor({timeout:60000});
  // Silêncio digital deve resultar em texto vazio, também no iframe.
  const silence=Buffer.alloc(44+16000*2);
  silence.write('RIFF');silence.writeUInt32LE(silence.length-8,4);silence.write('WAVE',8);silence.write('fmt ',12);silence.writeUInt32LE(16,16);silence.writeUInt16LE(1,20);silence.writeUInt16LE(1,22);silence.writeUInt32LE(16000,24);silence.writeUInt32LE(32000,28);silence.writeUInt16LE(2,32);silence.writeUInt16LE(16,34);silence.write('data',36);silence.writeUInt32LE(32000,40);
  await frame.locator('#audioFile').setInputFiles({name:'silencio.wav',mimeType:'audio/wav',buffer:silence});
  await frame.locator('#transcribeButton').click();
  await frame.locator('#audioStatus').filter({hasText:'silêncio digital detectado'}).waitFor();
  assert.equal(await frame.locator('#audioText').inputValue(),'');
  // Não existe rota para enviar um arquivo inválido a uma API.
  await frame.locator('#audioFile').setInputFiles({name:'arquivo-invalido.wav',mimeType:'audio/wav',buffer:Buffer.from('não é um áudio')});
  await frame.locator('#transcribeButton').click();
  await frame.locator('#transcribeButton').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('iframe').contentDocument.getElementById('audioFile').disabled);
  assert.equal(requests.length,0);
  assert.equal(await page.evaluate(()=>messages.length),0);
  await frame.locator('#clearSession').click();await frame.locator('#clearConfirm').click();
  assert.equal(await frame.locator('#audioFile').evaluate(n=>n.files.length),0);
  assert(await frame.locator('#transcribeButton').isDisabled());
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:browser.version(),offline:true,simulatedIframe:true,tests:['motor local no sandbox','silêncio sem palavras inventadas','áudio inválido sem alternativa de rede','nenhum postMessage para a página externa','limpeza encerra motor e remove arquivo'],httpRequests:requests.length,passed:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(temporary)fs.rmSync(temporary,{recursive:true,force:true});});
