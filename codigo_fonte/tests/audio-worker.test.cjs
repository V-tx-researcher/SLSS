'use strict';
/* Testa falhas do decodificador com saídas controladas, sem alegar acurácia. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const quality=require('../src/audio-quality.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/audio-worker.js'),'utf8').replace(/^import .*;\n/gm,'');
const eos=50257;
const loop=()=>Array.from({length:90},(_,i)=>[1,2,3][i%3]).concat(eos);
async function scenario(outputs,{silence=false,samples:given}={}){
 const messages=[],calls=[];
 const recognizer=async(samples,options)=>{await recognizer.model.generate({...options,num_frames:100});return {text:'Bom dia. A equipe confirmou o atendimento.'};};
 recognizer.tokenizer={decode:ids=>ids.includes(5)?'Bom dia. A equipe confirmou o atendimento.':'O que é '.repeat(Math.floor(ids.length/3))};
 recognizer.model={generation_config:{eos_token_id:eos},generate:async options=>{
  const ids=outputs[Math.min(calls.length,outputs.length-1)].slice();calls.push(options);
  for(let i=1;i<=ids.length;i++){
   if(options.stopping_criteria[0]._call([ids.slice(0,i)])[0]){ids.length=i;break;}
  }
  return {tolist:()=>[ids]};
 }};
 const self={postMessage:m=>messages.push(m)};
 const context=vm.createContext({self,env:{backends:{onnx:{wasm:{}}}},pipeline:async()=>recognizer,StoppingCriteria:class{},SigiloAudioQuality:quality,Float32Array,Response,Blob,URL,fetch});
 vm.runInContext(source,context);
 await self.onmessage({data:{type:'init',files:{'runtime/ort-wasm-simd-threaded.mjs':new Uint8Array([0]),'runtime/ort-wasm-simd-threaded.wasm':new Uint8Array([0])}}});
 const samples=given||new Float32Array(16000);if(!given&&!silence)samples.fill(.1);
 await self.onmessage({data:{type:'transcribe',samples,language:'portuguese'}});
 assert(samples.every(n=>n===0),'PCM descartado após sucesso ou falha');
 return {messages,calls};
}
(async()=>{
 let r=await scenario([loop(),loop()]);
 assert.equal(r.calls.length,2);assert(r.calls.every(c=>c.max_new_tokens<=64));
 assert(r.messages.some(m=>m.type==='quality-error'&&m.reason==='repetition'));
 assert(!r.messages.some(m=>m.type==='done'));
 r=await scenario([loop(),[5,6,7,8,eos]]);
 assert.equal(r.calls.length,2);assert.equal(r.calls[1].repetition_penalty,1.05);
 assert(r.messages.some(m=>m.type==='done'&&m.retried===1));
 r=await scenario([[5,6,7,8],[5,6,7,8]]);
 assert(r.messages.some(m=>m.type==='quality-error'&&m.reason==='incomplete'));
 r=await scenario([[5,6,7,8,eos]]);
 assert.equal(r.calls.length,1);assert(r.messages.some(m=>m.type==='done'&&m.retried===0));
 r=await scenario([[5,eos]],{silence:true});
 assert.equal(r.calls.length,0);assert(r.messages.some(m=>m.type==='done'&&m.silence));
 // Áudio de 700 s, dividido em três partes. A segunda falha duas vezes: só ela é marcada.
 r=await scenario([[5,6,7,8,eos],loop(),loop(),[5,6,7,8,eos]],{samples:new Float32Array(16000*700).fill(.1)});
 const done=r.messages.find(m=>m.type==='done');
 assert(done,'a transcrição parcial deve ser entregue');
 assert.equal(done.parts,3);assert.equal(done.failures.length,1);assert.equal(done.failures[0].reason,'repetition');
 assert(/\[trecho não transcrito: \d\d:\d\d a \d\d:\d\d\]/.test(done.text),'a parte perdida deve aparecer marcada');
 assert(done.text.startsWith('Bom dia'),'as partes válidas são mantidas');
 assert.equal(r.calls.length,4);
 // Todas as partes falham: nenhuma transcrição utilizável é declarada.
 r=await scenario([loop(),loop()],{samples:new Float32Array(16000*700).fill(.1)});
 assert(!r.messages.some(m=>m.type==='done'));
 assert(r.messages.some(m=>m.type==='quality-error'));
 console.log('6 cenários de decodificação passaram: repetição, nova tentativa, interrupção, sucesso, silêncio e transcrição parcial por partes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
