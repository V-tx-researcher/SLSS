'use strict';
const assert=require('node:assert/strict');
const quality=require('../src/audio-quality.js');
const eos=50257;
assert.equal(quality.inspectText('O que é '.repeat(160)),'repetition');
assert.equal(quality.inspectText('O que é? O que é? A equipe explicou a proposta e combinou o retorno.'),null);
assert.equal(quality.inspectText('Não, não, não. É necessário conferir os dados e os encaminhamentos.'),null);
assert.equal(quality.inspectText('Reunião: Maria informou o endereço. João perguntou o que é o serviço. A equipe explicou o que é o atendimento e confirmou o retorno.'),null);
assert.equal(quality.inspectText('Maria participou. '+'o que é '.repeat(30)+'O atendimento foi combinado.'),'repetition');
assert.equal(quality.inspectTokens([1,2,3,4,eos],eos),null);
assert.equal(quality.inspectTokens([1,2,3,4],eos),'incomplete');
assert.equal(quality.inspectTokens([...Array.from({length:60},(_,i)=>[1,2,3][i%3]),eos],eos),'repetition');
assert.equal(quality.inspectTokens([50364,1,2,50390,3,4,eos],eos),null);
// Divisão em partes: áudio curto fica inteiro; áudio longo é coberto sem lacunas e corta em silêncio.
const rate=16000;
assert.deepEqual(quality.planSegments(new Float32Array(rate*100).fill(.1),rate,300,12),[{start:0,end:rate*100}]);
const long=new Float32Array(rate*900).fill(.1);
for(let i=Math.round(rate*(600-1));i<Math.round(rate*(600+1));i++)long[i]=0; // pausa de 2 s perto de 600 s
const parts=quality.planSegments(long,rate,300,12);
assert(parts.length>=3,'900 s devem gerar ao menos três partes');
assert.equal(parts[0].start,0);assert.equal(parts.at(-1).end,long.length);
for(let i=1;i<parts.length;i++)assert.equal(parts[i].start,parts[i-1].end,'as partes são contíguas');
for(const p of parts.slice(0,-1))assert(p.end/rate-p.start/rate>=286&&p.end/rate-p.start/rate<=314,'partes têm cerca de 5 min');
assert(parts.some(p=>Math.abs(p.end/rate-600)<=1),'o corte escolhe a pausa de 600 s');
console.log('9 verificações de repetição, término e repetições legítimas passaram. Divisão em partes: '+parts.length+' partes em 900 s.');
