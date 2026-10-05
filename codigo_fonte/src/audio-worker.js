/* Sigilo Local: reconhecimento de fala apenas em memória. MIT. */
import {env, pipeline, StoppingCriteria} from '@huggingface/transformers';
import './audio-quality.js';

// Defesa adicional à CSP: este worker não pode buscar recursos externos.
const localFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, options) => {
  const address = typeof input === 'string' ? input : input.url;
  if (!String(address).startsWith('blob:')) return Promise.reject(new Error('Rede externa bloqueada.'));
  return localFetch(input, options);
};
globalThis.XMLHttpRequest = class { constructor(){ throw new Error('Rede externa bloqueada.'); } };
globalThis.WebSocket = class { constructor(){ throw new Error('Rede externa bloqueada.'); } };
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/memoria/';
env.useBrowserCache = false;
env.useFSCache = false;
env.useCustomCache = true;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
env.backends.onnx.logLevel = 'error';

// Partes de até 5 minutos, com corte em silêncio próximo ao limite.
const SAMPLE_RATE = 16000, PART_SECONDS = 300, CUT_SEARCH_SECONDS = 12, MAX_SECONDS = 5400;
let recognizer = null, active = false;
const tell = data => self.postMessage(data);
class RepetitionStop extends StoppingCriteria {
  constructor(eos){super();this.eos=eos;}
  _call(inputIds){
    return inputIds.map(ids=>{
      const textIds=ids.map(Number).filter(id=>id>=0&&id<this.eos);
      return SigiloAudioQuality.repeated(textIds,32,24);
    });
  }
}
class QualityError extends Error {
  constructor(reason,start,end){super('Resultado suspeito.');this.reason=reason;this.start=start;this.end=end;}
}
function clock(seconds){
  const s=Math.floor(seconds), h=Math.floor(s/3600), m=Math.floor(s%3600/60), sec=s%60;
  const pad=n=>String(n).padStart(2,'0');
  return h ? h+':'+pad(m)+':'+pad(sec) : pad(m)+':'+pad(sec);
}
function missingMarker(start,end){
  return '[trecho não transcrito: '+clock(start)+' a '+clock(end)+']';
}
self.onmessage = async ({data}) => {
  if (active) return;
  active = true;
  let samples;
  try {
    if (data.type === 'init') {
      const files = data.files;
      const moduleURL = URL.createObjectURL(new Blob([files['runtime/ort-wasm-simd-threaded.mjs']], {type:'text/javascript'}));
      const wasmURL = URL.createObjectURL(new Blob([files['runtime/ort-wasm-simd-threaded.wasm']], {type:'application/wasm'}));
      // A fábrica Emscripten calcula uma URL mesmo com wasmBinary. O adaptador
      // fornece uma URL blob válida sem alterar o código distribuído do runtime.
      const adapterURL = URL.createObjectURL(new Blob([
        'import factory from '+JSON.stringify(moduleURL)+';export default options=>factory({...options,locateFile:()=>'+JSON.stringify(wasmURL)+'});'
      ], {type:'text/javascript'}));
      env.backends.onnx.wasm.wasmBinary = files['runtime/ort-wasm-simd-threaded.wasm'];
      env.backends.onnx.wasm.wasmPaths = {mjs:adapterURL,wasm:wasmURL};
      env.customCache = {
        async match(key) {
          const marker = 'whisper-small/';
          const start = String(key).lastIndexOf(marker);
          const name = start < 0 ? '' : 'model/' + String(key).slice(start + marker.length);
          const bytes = files[name];
          return bytes ? new Response(bytes, {status:200, headers:{'Content-Length':String(bytes.byteLength)}}) : new Response(null, {status:404});
        },
        async put() {} // Nunca grava o modelo, áudio ou texto no navegador.
      };
      tell({type:'status',label:'Preparando o motor no dispositivo…'});
      recognizer = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-small', {
        device:'wasm', dtype:'q8', local_files_only:true, use_external_data_format:false
      });
      URL.revokeObjectURL(moduleURL);
      URL.revokeObjectURL(wasmURL);
      URL.revokeObjectURL(adapterURL);
      tell({type:'ready'});
    } else if (data.type === 'transcribe' && recognizer) {
      samples = data.samples;
      if (!(samples instanceof Float32Array) || samples.length > SAMPLE_RATE * MAX_SECONDS) throw new Error('Áudio inválido.');
      if(!['portuguese','english','spanish','auto'].includes(data.language))throw new Error('Idioma inválido.');
      // Silêncio digital não deve gerar palavras inventadas.
      let energy = 0;
      for (const sample of samples) {
        if(!Number.isFinite(sample))throw new Error('Áudio inválido.');
        energy += sample * sample;
      }
      if (!samples.length || energy === 0) {
        tell({type:'done',text:'',silence:true,failures:[],retried:0});
      } else {
        const parts = SigiloAudioQuality.planSegments(samples, SAMPLE_RATE, PART_SECONDS, CUT_SEARCH_SECONDS);
        const total = parts.reduce((sum, part) => sum + Math.max(1, Math.ceil(((part.end - part.start) / SAMPLE_RATE - 30) / 20) + 1), 0);
        let completed = 0, retried = 0;
        // Estado da parte atual, lido pelo interceptador de geração.
        let partStart = 0, partEnd = 0, chunkIndex = 0;
        const generate = recognizer.model.generate.bind(recognizer.model);
        recognizer.model.generate = async options => {
          const seconds=Math.min(30,options.num_frames/100);
          const eos=Number(recognizer.model.generation_config.eos_token_id);
          const bounded={...options,do_sample:false,max_new_tokens:Math.min(440,Math.max(64,Math.ceil(seconds*14)+40))};
          let result, reason;
          for(let attempt=0;attempt<2;attempt++){
            const stop=new RepetitionStop(eos);
            const retry=attempt?{repetition_penalty:1.05}:{};
            result=await generate({...bounded,...retry,stopping_criteria:[stop]});
            const ids=result.tolist()[0];
            const text=recognizer.tokenizer.decode(ids,{skip_special_tokens:true});
            reason=SigiloAudioQuality.inspectTokens(ids,eos)||SigiloAudioQuality.inspectText(text);
            if(!reason)break;
            if(!attempt){
              retried++;
              tell({type:'status',label:'Possível falha no trecho '+(completed+1)+'. Tentando novamente neste dispositivo…'});
            }
          }
          if(reason)throw new QualityError(reason,partStart+chunkIndex*20,Math.min(partEnd,partStart+chunkIndex*20+seconds));
          chunkIndex++;
          tell({type:'progress',completed:++completed,total});
          return result;
        };
        const texts = [], failures = [];
        let usable = 0;
        try {
          const options = {task:'transcribe',chunk_length_s:30,stride_length_s:5,return_timestamps:true};
          if (data.language !== 'auto') options.language = data.language;
          for (const [index, part] of parts.entries()) {
            const piece = samples.subarray(part.start, part.end);
            const start = part.start / SAMPLE_RATE, end = part.end / SAMPLE_RATE;
            partStart = start; partEnd = end; chunkIndex = 0;
            if (parts.length > 1) tell({type:'status',label:'Transcrevendo parte '+(index+1)+' de '+parts.length+' neste dispositivo…'});
            let pieceEnergy = 0;
            for (const sample of piece) pieceEnergy += sample * sample;
            if (pieceEnergy === 0) continue; // Silêncio digital desta parte: nada a transcrever.
            try {
              const output = await recognizer(piece, options);
              const text = output.text.trim();
              if (SigiloAudioQuality.inspectText(text)) throw new QualityError('repetition', start, end);
              texts.push(text);
              usable++;
            } catch (error) {
              if (!(error instanceof QualityError)) throw error;
              // A parte inteira é marcada; nenhuma palavra é inventada para preencher a lacuna.
              failures.push({start, end, reason: error.reason});
              texts.push(missingMarker(start, end));
            }
          }
        } finally {
          recognizer.model.generate = generate;
        }
        if (!usable && failures.length) {
          tell({type:'quality-error',reason:failures[0].reason,start:failures[0].start,end:failures.at(-1).end});
        } else {
          tell({type:'done',text:texts.join(' ').replace(/[ \t]+/g,' ').trim(),retried,failures,parts:parts.length});
        }
      }
    } else throw new Error('Operação inválida.');
  } catch (error) {
    if(error instanceof QualityError)tell({type:'quality-error',reason:error.reason,start:error.start,end:error.end});
    else tell({type:'error',stage:data.type});
  } finally {
    if (samples) samples.fill(0);
    active = false;
  }
};
