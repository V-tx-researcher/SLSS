'use strict';
/* Testes de integração do DOM. Não substituem testes visuais em navegadores reais. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { JSDOM, VirtualConsole } = require(process.env.SIGILO_JSDOM_MODULE || 'jsdom');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'SLSS_Wix.html'), 'utf8');
const demo = fs.readFileSync(path.join(root, 'texto_ficticio.txt'), 'utf8');
const errors = [], requests = [], workers = [], downloads = [], objectUrls = new Map();
let clipboard = '', total = 0, serial = 0;
const consoleBridge = new VirtualConsole();
consoleBridge.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(html, {
  url: 'file:///SLSS_Wix.html', runScripts:'dangerously', pretendToBeVisual:true,
  virtualConsole:consoleBridge,
  beforeParse(w) {
    w.Blob = Blob;
    w.URL.createObjectURL = blob => {const id = 'blob:test-'+(++serial);objectUrls.set(id,blob);return id;};
    w.URL.revokeObjectURL = id => objectUrls.delete(id);
    w.Worker = class {
      constructor(url) { this.blob = objectUrls.get(url); this.terminated = false; workers.push(this); }
      postMessage(data) {
        setTimeout(async () => {
          if (this.terminated) return;
          try {
            const code = await this.blob.text();
            const self = { postMessage:message => {if(!this.terminated)this.onmessage?.({data:message});} };
            const context = vm.createContext({self});
            vm.runInContext(code,context);
            if(!this.terminated)self.onmessage({data});
          } catch(err) {this.onerror?.(err);}
        },15);
      }
      terminate() {this.terminated = true;this.blob = null;}
    };
    w.fetch = (...args) => {requests.push(args);throw new Error('Rede bloqueada no teste');};
    w.XMLHttpRequest = class {open(...args){requests.push(args);throw new Error('XHR bloqueado no teste');}};
    w.WebSocket = class {constructor(...args){requests.push(args);throw new Error('WS bloqueado no teste');}};
    Object.defineProperty(w.navigator, 'clipboard', {value:{writeText:async text => {clipboard=text;}}});
    Object.defineProperty(w.navigator, 'sendBeacon', {value:(...args)=>{requests.push(args);return false;}});
    w.HTMLDialogElement.prototype.showModal = function(){this.open=true;};
    w.HTMLDialogElement.prototype.close = function(){this.open=false;};
    w.document.execCommand = () => false;
    w.HTMLAnchorElement.prototype.click = function(){downloads.push({url:this.href,name:this.download});};
  }
});
const w=dom.window, $=id=>w.document.getElementById(id);
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn) {for(let i=0;i<100;i++){if(fn())return;await wait(10);}throw new Error('Tempo de espera excedido');}
function click(id){$(id).click();}
function change(id,value){const el=$(id);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));}
function input(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));}
async function scan(){click('scanButton');await until(()=>$('progressBox').hidden && ! $('generateButton').disabled);}
async function test(title,fn){await fn();total++;console.log('OK '+title);}

(async()=>{
  await test('HTML autocontido: hashes de scripts/estilo e bloqueio de conexões',()=>{
    const policy=w.document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
    assert(policy.includes('connect-src blob:'));
    assert(!/connect-src[^;]*https?:/.test(policy));
    for(const el of [...w.document.querySelectorAll('script:not([type]), style')]) {
      const hash=crypto.createHash('sha256').update(el.textContent).digest('base64');
      assert(policy.includes("'sha256-"+hash+"'"));
    }
    assert.equal(w.document.querySelectorAll('script[src],link[rel=stylesheet]').length,0);
    assert.equal(w.localStorage?.length||0,0);
  });
  await test('início vazio e nove prompts disponíveis',()=>{
    assert.equal($('sourceText').value,'');
    assert.equal($('protectedText').value,'');
    assert.equal($('promptSelect').options.length,9);
    assert($('copyProtected').disabled);
  });
  await test('carregamento fictício e varredura em worker local',async()=>{
    click('loadDemo');assert.equal($('sourceText').value,demo);
    await scan();
    assert($('candidateRows').children.length>20);
    assert.equal($('reviewText').value,demo);
    assert(workers.length>0);
    assert(workers.at(-1).terminated);
    assert.equal(objectUrls.size,0);
  });
  await test('marcação manual de pista contextual',()=>{
    const phrase='única motorista de transporte escolar da pequena comunidade onde mora';
    const start=demo.indexOf(phrase);
    $('reviewText').setSelectionRange(start,start+phrase.length);
    click('markSelection');
    assert($('candidateRows').textContent.includes(phrase));
    assert($('candidateRows').textContent.includes('Marcação manual'));
    click('generateButton');
    assert(!$('protectedText').value.includes(phrase));
    assert($('copyCombined').disabled);
  });
  await test('cópia depende da revisão e não inclui nomes originais',async()=>{
    change('reviewed',true);assert(!$('copyCombined').disabled);
    click('copyCombined');await wait(1);
    assert(clipboard.includes('=== TEXTO PROTEGIDO ==='));
    assert(!clipboard.includes('Mariana Almeida'));
    assert(!clipboard.includes('mariana@example.invalid'));
    assert(clipboard.includes('Preserve cada marcador'));
    for(const option of $('promptSelect').options){change('promptSelect',option.value);assert($('promptPreview').value.includes('Preserve cada marcador'));}
  });
  await test('cópia de teste, validação e reinserção completa',()=>{
    click('useProtected');assert.equal($('returnedText').value,$('protectedText').value);
    click('checkReturn');assert(!$('restoreButton').disabled);
    click('restoreButton');assert.equal($('finalText').value,demo);
    assert($('downloadFinal').disabled);
    change('resultReviewed',true);assert(!$('downloadFinal').disabled);
  });
  await test('reinserção seletiva conserva e-mail em código',()=>{
    const box=w.document.querySelector('[data-restore-category][value=EMAIL]');
    box.checked=false;box.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal($('finalText').value,'');assert($('copyFinal').disabled);
    click('restoreButton');
    assert(!$('finalText').value.includes('mariana@example.invalid'));
    assert($('finalText').value.includes('[EMAIL_'));
  });
  await test('retorno alterado invalida a revisão e bloqueia códigos desconhecidos',()=>{
    const altered=$('protectedText').value.replace(/\[NOME_PESSOA_[^\]]+\]/,'[NOME_PESSOA_OUTRASESSAO_001]');
    input('returnedText',altered);assert($('restoreButton').disabled);assert.equal($('finalText').value,'');
    click('checkReturn');assert($('restoreButton').disabled);
    assert($('validationBox').textContent.includes('desconhecido'));
  });
  await test('mudança de marcação e de fonte invalida códigos anteriores',()=>{
    const first=w.document.querySelector('[data-action=accept]');first.checked=false;first.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal($('protectedText').value,'');assert.equal($('returnedText').value,'');assert(!$('reviewed').checked);
    click('generateButton');assert($('protectedText').value.length>0);
    input('sourceText',demo+'\nNovo texto fictício.');
    assert.equal($('protectedText').value,'');assert($('generateButton').disabled);assert.equal($('candidateRows').children.length,0);
  });
  await test('lista privada da sessão entra na varredura',async()=>{
    input('sourceText',demo);input('privateText','pessoa;Mimu');await scan();
    assert(Array.from($('candidateRows').querySelectorAll('.original-value')).some(el=>el.textContent==='Mimu'));
    click('generateButton');assert(!$('protectedText').value.includes('Mimu'));
  });
  let oldProtected='';
  await test('limpeza remove campos, lista, mapa e histórico da interface',()=>{
    oldProtected=$('protectedText').value;const oldArea=$('sourceText');
    click('clearSession');assert($('clearDialog').open);click('clearConfirm');
    for(const id of ['sourceText','privateText','reviewText','protectedText','returnedText','finalText','copyFallbackText'])assert.equal($(id).value,'',id);
    assert.notEqual($('sourceText'),oldArea);
    assert.equal($('candidateRows').children.length,0);assert.equal($('categoryChoices').children.length,0);
    assert($('copyProtected').disabled);assert($('generateButton').disabled);assert.equal($('promptSelect').value,'correcao');
    input('returnedText',oldProtected);click('checkReturn');assert($('restoreButton').disabled);
  });
  await test('limpeza durante varredura interrompe worker e ignora resposta tardia',()=>{
    click('loadDemo');click('scanButton');const active=workers.at(-1);
    click('clearSession');click('clearConfirm');assert(active.terminated);
    active.onmessage({data:{done:true,out:[{id:'late',original:'resposta tardia',start:0,end:10,category:'NOME_PESSOA',enabled:true}]}});
    assert.equal($('sourceText').value,'');assert.equal($('candidateRows').children.length,0);assert($('generateButton').disabled);
  });
  await test('texto importado é texto; não executa HTML nem usa rede',async()=>{
    input('sourceText','Teste fictício <img src="https://example.invalid/track" onerror="alert(1)">.');await scan();
    // O logo do próprio aplicativo é a única imagem permitida; o texto importado não cria imagens.
    assert.equal(w.document.querySelectorAll('img:not(.brand-logo)').length,0);assert.equal(requests.length,0);
  });
  await test('iframe sem Worker usa varredura local com o mesmo resultado',async()=>{
    const OriginalWorker=w.Worker;
    try {w.Worker=undefined;click('loadDemo');await scan();assert($('candidateRows').textContent.includes('Mariana Almeida'));}
    finally {w.Worker=OriginalWorker;}
  });
  await test('erro assíncrono do Worker também usa a alternativa local',async()=>{
    click('loadDemo');click('scanButton');const blocked=workers.at(-1);blocked.onerror(new Error('Worker bloqueado no iframe'));
    await until(()=>$('progressBox').hidden && !$('generateButton').disabled);
    assert(blocked.terminated);assert($('candidateRows').textContent.includes('Mariana Almeida'));
  });
  await test('restrição de 100 mil caracteres no modo sem Worker é explícita',async()=>{
    const OriginalWorker=w.Worker;
    try {w.Worker=undefined;input('sourceText','x'.repeat(100001));click('scanButton');assert($('progressBox').hidden);assert($('generateButton').disabled);assert($('toast').textContent.includes('100 mil'));}
    finally {w.Worker=OriginalWorker;}
  });
  await test('iframe com clipboard negado permite copiar manualmente e limpar o diálogo',async()=>{
    click('loadDemo');await scan();click('generateButton');change('reviewed',true);
    const write=w.navigator.clipboard.writeText;
    w.navigator.clipboard.writeText=async()=>{throw new Error('Permissão negada');};
    try {click('copyProtected');await until(()=>$('copyDialog').open);assert.equal($('copyFallbackText').value,$('protectedText').value);click('closeCopy');assert.equal($('copyFallbackText').value,'');}
    finally {w.navigator.clipboard.writeText=write;}
  });
  await test('exportação incorporada oferece alternativa manual e descarta seu conteúdo',async()=>{
    click('downloadProtected');assert(downloads.at(-1).url.startsWith('blob:'));assert.equal(downloads.at(-1).name,'texto_protegido.txt');
    assert($('exportDialog').open);assert.equal($('exportFallbackText').value,$('protectedText').value);
    assert(!$('exportFallbackText').value.includes('Mariana Almeida'));
    click('closeExport');assert.equal($('exportFallbackText').value,'');
    click('downloadProtected');click('clearSession');click('clearConfirm');assert.equal($('exportFallbackText').value,'');assert(!$('exportDialog').open);
    await wait(2);assert.equal(objectUrls.size,0);
  });
  await test('sair da página descarta a sessão',()=>{
    w.dispatchEvent(new w.Event('pagehide'));assert.equal($('sourceText').value,'');assert.equal($('privateText').value,'');
    assert.equal($('candidateRows').children.length,0);
  });
  assert.equal(requests.length,0);
  assert.deepEqual(errors,[]);
  console.log(total+' testes de integração do DOM passaram.');
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>dom.window.close());
