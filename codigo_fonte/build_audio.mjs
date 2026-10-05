/* Reconstrói apenas recursos públicos. Node 20+, npm ci --ignore-scripts. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const root=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const ort=path.dirname(require.resolve('onnxruntime-web'));
const common={bundle:true,minify:true,platform:'browser',target:'es2022',legalComments:'inline'};
await build({...common,entryPoints:[path.join(root,'src/audio-worker.js')],outfile:path.join(root,'motor/worker.js'),format:'iife',alias:{'onnxruntime-web':path.join(ort,'ort.wasm.min.mjs')}});
await build({...common,entryPoints:[path.join(root,'src/audio-unzip.js')],outfile:path.join(root,'src/audio-unzip.bundle.js'),format:'iife'});
fs.mkdirSync(path.join(root,'motor/runtime'),{recursive:true});
for(const ext of ['mjs','wasm'])fs.copyFileSync(path.join(ort,'ort-wasm-simd-threaded.'+ext),path.join(root,'motor/runtime/ort-wasm-simd-threaded.'+ext));
console.log('Runtime público reconstruído. Execute python package_motor.py e python build.py.');
