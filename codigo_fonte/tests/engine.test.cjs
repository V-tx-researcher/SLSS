'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../src/engine.js');
const root = path.resolve(__dirname, '..');
const base = JSON.parse(fs.readFileSync(path.join(root, 'src/base.json'), 'utf8'));
const index = E.makeIndex(base);
const demo = fs.readFileSync(path.join(root, 'texto_ficticio.txt'), 'utf8');
const tag = 'AB12CD34EF56AB12CD34EF56';
let total = 0;
function test(title, fn) { fn(); total++; console.log('OK ' + title); }
const candidates = E.detect(demo, index);
const protectedDemo = E.protect(demo, candidates, tag);

test('detecta separadamente os dois nomes unidos por e', () => {
  const text = 'Luana Moraes e Rafael dos Santos participaram.';
  const hits = E.detect(text, index).filter(c => c.category === 'NOME_PESSOA').map(c => c.original);
  assert.deepEqual(hits, ['Luana Moraes', 'Rafael dos Santos']);
});
test('detecta contatos, documentos, instituições e endereço fictícios', () => {
  for (const [category, original] of [
    ['NOME_PESSOA', 'Mariana Almeida'], ['NOME_INSTITUICAO', 'CRAS Jardim das Nuvens'],
    ['EMAIL', 'mariana@example.invalid'], ['TELEFONE', '(00) 90000-0000'],
    ['CPF', '000.000.000-00'], ['RG', '00.000.000-0'], ['CEP', '00000-000'],
    ['PRONTUARIO', 'FICT-2026-0001'], ['PROTOCOLO', 'TESTE-2026-0002']
  ]) assert(candidates.some(c => c.category === category && c.original === original), category);
  assert(candidates.some(c => c.category === 'ENDERECO' && c.original.includes('Rua das Nuvens')));
  for (let i = 1; i < candidates.length; i++) assert(candidates[i-1].end <= candidates[i].start);
});
test('Rosa pessoa é candidata, rosa cor fica intacta', () => {
  const text = 'A paciente Rosa chegou; a parede da sala é rosa.';
  const hits = E.detect(text, index);
  assert(hits.some(c => c.original === 'Rosa' && c.category === 'NOME_PESSOA'));
  assert(!hits.some(c => c.original === 'rosa'));
});
test('reconhece limites: a pista contextual requer marcação manual', () => {
  assert(!candidates.some(c => c.original.includes('única motorista de transporte escolar')));
  const phrase = 'única motorista de transporte escolar da pequena comunidade onde mora';
  const start = demo.indexOf(phrase);
  const manual = {id:'manual', start, end:start+phrase.length, original:phrase, category:'TRECHO_SIGILOSO', enabled:true};
  const selection = candidates.filter(c => c.end <= manual.start || c.start >= manual.end).concat(manual);
  const output = E.protect(demo, selection, tag);
  assert(!output.text.includes(phrase));
  assert.equal(E.restore(output.text, output.mapping), demo);
});
test('ida e volta conserva o texto exatamente', () => {
  assert(E.validate(protectedDemo.text, protectedDemo.mapping).valid);
  assert.equal(E.restore(protectedDemo.text, protectedDemo.mapping), demo);
  assert(!protectedDemo.text.includes('mariana@example.invalid'));
  assert(!protectedDemo.text.includes('Mariana Almeida'));
});
test('mesma grafia reutiliza código; homônimos podem ser separados', () => {
  const text = 'Luana Moraes falou. Luana Moraes respondeu.';
  const cs = E.detect(text, index);
  const shared = E.protect(text, cs, tag);
  assert.equal(shared.mapping.length, 1);
  assert.equal(shared.mapping[0].count, 2);
  cs[1].exclusive = true;
  const separated = E.protect(text, cs, tag);
  assert.equal(separated.mapping.length, 2);
  assert.equal(E.restore(separated.text, separated.mapping), text);
});
test('resumo pode omitir códigos; reordenação funciona por correspondência exata', () => {
  const names = protectedDemo.mapping.filter(m => m.category === 'NOME_PESSOA');
  const returned = names[1].token + ' ouviu ' + names[0].token + '.';
  const check = E.validate(returned, protectedDemo.mapping);
  assert(check.valid);
  assert(check.missing.length > 0);
  assert.equal(E.restore(returned, protectedDemo.mapping), names[1].original + ' ouviu ' + names[0].original + '.');
});
test('código desconhecido e código de outra sessão impedem restauração', () => {
  const first = protectedDemo.mapping[0].token;
  const bad = protectedDemo.text.replace(first, first.replace(tag, 'FFFFFFFFFFFFFFFFFFFFFFFF'));
  assert(!E.validate(bad, protectedDemo.mapping).valid);
  assert.throws(() => E.restore(bad, protectedDemo.mapping));
});
test('marcadores danificados impedem restauração em todas as categorias', () => {
  for (const cat of Object.keys(E.CATEGORIES)) {
    const token = '['+cat+'_'+tag+'_001]';
    const map = [{token, category:cat, original:'dado fictício', count:1}];
    for (const damaged of [token.slice(1), token.slice(0,-1), token.toLowerCase(), '['+cat+'_ABC]','['+cat+'_ABC']) {
      assert(!E.validate(damaged, map).valid, damaged);
      assert.throws(() => E.restore(damaged, map));
    }
  }
});
test('reinserção seletiva mantém as outras categorias protegidas', () => {
  const returned = E.restore(protectedDemo.text, protectedDemo.mapping, new Set(['NOME_PESSOA']));
  assert(returned.includes('Mariana Almeida'));
  assert(!returned.includes('mariana@example.invalid'));
  assert(returned.includes(protectedDemo.mapping.find(m => m.category === 'EMAIL').token));
});
test('mudança do original, sobreposição e colisão invalidam as marcações', () => {
  assert.throws(() => E.protect('alterado '+demo, candidates, tag));
  assert.throws(() => E.protect(demo, candidates.concat(candidates[0]), tag));
  assert.throws(() => E.protect(demo+'_'+tag+'_001', candidates, tag));
});
test('lista privada reconhece apelidos sem mudar a base global', () => {
  const parsed = E.parsePrivate('pessoa;Mimu\ninstituicao;Projeto Neblina Serena\n# comentário');
  assert.equal(parsed.errors.length, 0);
  const hits = E.detect('Mimu compareceu ao Projeto Neblina Serena.', index, parsed.entries);
  assert(hits.some(c => c.original === 'Mimu' && c.category === 'NOME_PESSOA'));
  assert(hits.some(c => c.original === 'Projeto Neblina Serena' && c.category === 'NOME_INSTITUICAO'));
  assert(!E.detect('Mimu', index).some(c => c.original === 'Mimu'));
  assert.equal(E.parsePrivate('categoria_desconhecida;Mimu').errors.length, 1);
});
test('um marcador preexistente pode ser protegido e restaurado sem interpretação recursiva', () => {
  const text = 'Literal [NOME_PESSOA_OUTRASESSAO_001].';
  const cs = E.detect(text, index);
  const output = E.protect(text, cs, tag);
  assert.equal(E.restore(output.text, output.mapping), text);
});
test('formatos rotulados não absorvem a frase depois do documento', () => {
  const hits = E.detect('RG 1234567 e atendimento realizado. Agência 0001 e conta informada.', index);
  assert(hits.some(c => c.category === 'DOCUMENTO' && c.original === '1234567'));
  assert(hits.some(c => c.category === 'DADO_FINANCEIRO' && c.original === '0001'));
});
test('marcação Unicode conserva offsets com acentos e emoji', () => {
  const text = '🟢 A paciente Luana Moraes enviou um e-mail a@exemplo.invalid.';
  const cs = E.detect(text, index);
  const output = E.protect(text, cs, tag);
  assert.equal(E.restore(output.text, output.mapping), text);
});
console.log(total + ' testes do motor passaram.');
