/* Sigilo Local — MIT. Motor determinístico, sem modelos de IA. */
(function (root) {
  'use strict';
  const CATEGORIES = {
    NOME_PESSOA: 'Nome de pessoa', NOME_INSTITUICAO: 'Nome de instituição',
    ENDERECO: 'Endereço', LOCALIDADE: 'Localidade', EMAIL: 'E-mail',
    TELEFONE: 'Telefone', CPF: 'CPF', CNPJ: 'CNPJ', RG: 'RG',
    DOCUMENTO: 'Outro documento', PRONTUARIO: 'Prontuário', PROTOCOLO: 'Protocolo',
    PROCESSO: 'Processo', CEP: 'CEP', DATA: 'Data', HORARIO: 'Horário',
    IDADE: 'Idade', IDENTIFICADOR_DIGITAL: 'Identificador digital',
    DADO_FINANCEIRO: 'Dado financeiro', TRECHO_SIGILOSO: 'Trecho confidencial'
  };
  const norm = s => String(s).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const tokenize = s => Array.from(s.matchAll(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu), m => ({raw:m[0], n:norm(m[0]), start:m.index, end:m.index+m[0].length}));
  const caps = s => /^\p{Lu}/u.test(s);
  const links = new Set('de da do das dos e del della van von du di la le'.split(' '));
  const stop = new Set('a o as os em no na nos nas foi foram era eram ele ela eles elas eu voce voces nós nos seu sua seus suas para por com sem uma um hoje ontem amanhã amanha reunião reuniao exemplo texto ficticio fictícia ficticia registro relato atendimento encaminhamento encaminhamentos demanda informações informacoes informou relatou disse compareceu compareceram possui mora reside trabalha contato endereco endereço email telefone cpf cnpj rg cep protocolo prontuario prontuário processo documento documentos dados data hora idade sigilo evolucao evolução paciente usuario usuaria usuário usuária serviço servico social profissional equipe rede saúde saude educação educacao relatórios relatório relatorio após apos então entao sera será pendente responsável responsavel participantes decisões decisoes pauta ata copia copiar sim não nao observação observacao município municipio cidade bairro retornar retorno número numero somente constam receita direitos centro escola hospital instituto secretaria unidade associacao associação capitulo capítulo resumo proxima próxima entre ainda contudo desta deste dessa desse aquela aquele isto isso por favor informação informacao assunto conselho federal regional'.split(' '));
  const institutionHeads = new Set('hospital instituto universidade faculdade escola colégio colegio associação associacao fundação fundacao secretaria prefeitura empresa organização organizacao cooperativa clínica clinica creas cras caps ubs upa ong'.split(' '));
  const instLower = new Set('municipal estadual federal saúde saude educação educacao assistência assistencia social referência referencia especializada especializado atenção atencao básica basica criança crianca adolescente desenvolvimento humano família familia convivência convivencia acolhimento integral'.split(' '));
  const contiguous = (s, a, b) => /^[\s\-]*$/u.test(s.slice(a.end,b.start)) && !/\n\s*\n/.test(s.slice(a.end,b.start));
  function makeIndex(base) {
    const first = new Set(), last = new Set();
    for(const name of base.firstNames || []) for(const t of tokenize(name)) first.add(t.n);
    for(const name of base.lastNames || []) for(const t of tokenize(name)) last.add(t.n);
    const trie = new Map();
    for(const term of base.institutions || []) insert(trie, term, 'NOME_INSTITUICAO', 'Dicionário de instituições', 105);
    return {first,last,trie};
  }
  function insert(trie, term, category, reason, priority) {
    const ts=tokenize(term); if(!ts.length) return;
    let node=trie;
    for(const t of ts) { if(!node.has(t.n)) node.set(t.n,new Map()); node=node.get(t.n); }
    if(!node.has('$')) node.set('$',[]);
    node.get('$').push({category,reason,priority});
  }
  function parsePrivate(text) {
    const aliases = {pessoa:'NOME_PESSOA', nome:'NOME_PESSOA', instituicao:'NOME_INSTITUICAO', instituição:'NOME_INSTITUICAO', endereco:'ENDERECO', endereço:'ENDERECO', localidade:'LOCALIDADE', trecho:'TRECHO_SIGILOSO'};
    const entries=[], errors=[];
    String(text).split(/\r?\n/).forEach((line,i)=>{
      line=line.trim(); if(!line || line.startsWith('#') || /^(categoria|tipo)[;\t]/i.test(line)) return;
      const match=line.match(/^([^;\t]+)[;\t](.+)$/);
      let category='NOME_PESSOA', term=line;
      if(match) { category=aliases[norm(match[1].trim())] || match[1].trim().toUpperCase(); term=match[2].trim(); }
      if(!CATEGORIES[category]) errors.push('Categoria desconhecida na linha '+(i+1)+'.');
      else if(term.length<2) errors.push('Termo muito curto na linha '+(i+1)+'.');
      else entries.push({category,term});
    });
    return {entries,errors};
  }
  function detect(text, index, privateEntries=[], progress=()=>{}) {
    const proposals=[];
    const add=(start,end,category,reason,priority=50,review=false)=>{
      if(start>=0 && end>start && end<=text.length) proposals.push({start,end,category,reason,priority,review,original:text.slice(start,end),enabled:true,exclusive:false});
    };
    const pattern=(re,cat,why,priority=130,group=0)=>{
      for(const m of text.matchAll(re)) { const s=group ? m.index+m[0].lastIndexOf(m[group]) : m.index; add(s,s+m[group].length,cat,why,priority); }
    };
    progress(10,'Procurando contatos e documentos');
    pattern(/\b[A-Z0-9._%+-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}\b/gi,'EMAIL','Formato de e-mail',150);
    pattern(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,'CNPJ','Formato de CNPJ',148);
    pattern(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,'CPF','Formato de CPF, mesmo se inválido',148);
    pattern(/\b\d{2}\.\d{3}\.\d{3}-[\dXx]\b/g,'RG','Formato de RG',146);
    pattern(/\bCPF\s*(?:n[º°o.]?\s*)?[:\-]?\s*(\d[\d .-]{9,16}\d)\b/gi,'CPF','Número precedido de CPF',149,1);
    pattern(/\b(?:RG|CNS|NIS|PIS|passaporte|matrícula|matricula|registro profissional)\s*(?:n[º°o.]?\s*)?[:\-]?\s*([A-Z0-9][A-Z0-9.\/-]{3,40})\b/gi,'DOCUMENTO','Identificador indicado por rótulo',140,1);
    pattern(/(?:\+55\s*)?(?:\(\d{2}\)|\b\d{2})\s*\d{4,5}[-\s]\d{4}\b/g,'TELEFONE','Formato de telefone com DDD',145);
    pattern(/\b(?:telefone|celular|whatsapp|contato telefônico)\s*[:\-]?\s*(\+?\d[\d() .-]{6,20}\d)\b/gi,'TELEFONE','Número precedido de contato',145,1);
    pattern(/\b\d{5}-\d{3}\b/g,'CEP','Formato de CEP',130);
    pattern(/\b(?:prontuário|prontuario)\s*(?:n[º°o.]?\s*)?[:\-]?\s*([A-Z0-9][A-Z0-9.\/-]{2,40})\b/gi,'PRONTUARIO','Rótulo de prontuário',145,1);
    pattern(/\b(?:protocolo)\s*(?:n[º°o.]?\s*)?[:\-]?\s*([A-Z0-9][A-Z0-9.\/-]{2,40})\b/gi,'PROTOCOLO','Rótulo de protocolo',145,1);
    pattern(/\b(?:processo)\s*(?:n[º°o.]?\s*)?[:\-]?\s*([A-Z0-9][A-Z0-9.\/-]{2,40})\b/gi,'PROCESSO','Rótulo de processo',145,1);
    pattern(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g,'PROCESSO','Formato de número processual',145);
    pattern(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi,'IDENTIFICADOR_DIGITAL','Link que pode identificar pessoa ou instituição',150);
    pattern(/(?<![\w@])@[\p{L}\p{N}_.]{2,30}/gu,'IDENTIFICADOR_DIGITAL','Nome de usuário em rede social',140);
    pattern(/\b(?:chave pix|conta bancária|conta bancaria|agência|agencia)\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\/-]{2,40})\b/gi,'DADO_FINANCEIRO','Rótulo de informação financeira',139,1);
    pattern(/\b\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{4}|\d{2})\b/g,'DATA','Data exata',120);
    pattern(/\b\d{1,2}(?:h\d{0,2}|:\d{2})\b/g,'HORARIO','Horário exato',120);
    pattern(/\b\d{1,3}\s+anos\b/gi,'IDADE','Idade em anos',120);
    pattern(/\b(?:Rua|Avenida|Av\.|Travessa|Alameda|Estrada|Praça|Rodovia)\s+[\p{L}\p{M}\d'’ .-]{2,90},\s*(?:n[º°o.]?\s*)?\d+[^\n.;]{0,120}/giu,'ENDERECO','Logradouro e número, com complemento',142);
    pattern(/\b(?:endereço|endereco)\s*:\s*([^\n;]{4,160})/gi,'ENDERECO','Endereço indicado por rótulo',140,1);
    pattern(/\[(?:NOME[ _]|ENDERECO|EMAIL|CPF|RG|TELEFONE|TRECHO_SIGILOSO)[^\]\r\n]{0,180}\]/gi,'TRECHO_SIGILOSO','Marcador preexistente no texto',155);
    progress(30,'Consultando dicionários locais');
    const ts=tokenize(text), privateTrie=new Map();
    for(const e of privateEntries) insert(privateTrie,e.term,e.category,'Lista privada da sessão',160);
    function scanTrie(trie,i) {
      let node=trie, j=i;
      while(j<ts.length && node.has(ts[j].n) && (j===i || contiguous(text,ts[j-1],ts[j]))) {
        node=node.get(ts[j].n);
        for(const hit of node.get('$') || []) add(ts[i].start,ts[j].end,hit.category,hit.reason,hit.priority);
        j++;
      }
    }
    function sequence(i, mode) {
      let last=i, j=i+1, pending=false;
      while(j<ts.length && j-i<14 && contiguous(text,ts[j-1],ts[j])) {
        const t=ts[j];
        if(links.has(t.n)) { if(mode==='person' && t.n==='e') break; pending=true; j++; continue; }
        const allowed = mode==='institution' ? caps(t.raw) || instLower.has(t.n) : (!stop.has(t.n) && (index.first.has(t.n) || index.last.has(t.n) || caps(t.raw)));
        if(!allowed || (mode==='person' && stop.has(t.n))) break;
        last=j; pending=false; j++;
      }
      return last;
    }
    for(let i=0;i<ts.length;i++) {
      if(i%400===0) progress(30+Math.floor(i/Math.max(1,ts.length)*55),'Analisando nomes e instituições');
      const t=ts[i]; scanTrie(index.trie,i); scanTrie(privateTrie,i);
      if(institutionHeads.has(t.n) || (t.n==='centro' && ts[i+1] && ['de','referencia','referência'].includes(ts[i+1].n)) || (t.n==='unidade' && ts[i+1] && ['de','basica','básica'].includes(ts[i+1].n))) {
        const last=sequence(i,'institution');
        if(last>i || /^[A-Z]{2,8}$/.test(t.raw)) add(t.start,ts[last].end,'NOME_INSTITUICAO','Expressão de instituição ou serviço',100,last===i);
      }
      if(['cidade','bairro','municipio'].includes(t.n) && ts[i+1] && caps(ts[i+1].raw)) {
        const last=sequence(i,'institution'); if(last>i) add(t.start,ts[last].end,'LOCALIDADE','Expressão de localidade',102);
      }
      const prefix=norm(text.slice(Math.max(0,t.start-45),t.start));
      const context=/(?:paciente|usuario|usuaria|senhor|senhora|sr\.?|sra\.?|professor|professora|dra?\.?|assistente social|responsavel|nome)\s*[:,-]?\s*$/u.test(prefix);
      const known=index.first.has(t.n) && !stop.has(t.n);
      if((known && (caps(t.raw) || context)) || (context && !stop.has(t.n))) {
        const last=sequence(i,'person');
        add(t.start,ts[last].end,'NOME_PESSOA',context?'Nome sugerido pelo contexto':'Prenome e sequência de sobrenomes',known?65:55,!known || last===i);
      } else if(caps(t.raw) && !stop.has(t.n) && !institutionHeads.has(t.n)) {
        const next=ts[i+1];
        if(next && caps(next.raw) && !stop.has(next.n) && contiguous(text,t,next)) {
          const last=sequence(i,'person');
          if(last>i) add(t.start,ts[last].end,'NOME_PESSOA','Sequência em maiúsculas iniciais: conferir',35,true);
        } else if(index.last.has(t.n) && t.raw.length>2) add(t.start,t.end,'NOME_PESSOA','Sobrenome isolado: conferir',25,true);
      }
    }
    progress(90,'Resolvendo trechos sobrepostos');
    proposals.sort((a,b)=>b.priority-a.priority || (b.end-b.start)-(a.end-a.start) || a.start-b.start);
    const occupied=new Uint8Array(text.length), out=[];
    for(const p of proposals) {
      let conflict=false;
      for(let k=p.start;k<p.end;k++) if(occupied[k]) { conflict=true; break; }
      if(conflict) continue;
      occupied.fill(1,p.start,p.end); out.push(p);
    }
    out.sort((a,b)=>a.start-b.start);
    out.forEach((c,i)=>c.id='c'+i);
    progress(100,'Varredura concluída');
    return out;
  }
  function protect(text,candidates,tag) {
    if(!/^[A-F0-9]{16,64}$/.test(tag)) throw new Error('Identificador de sessão inválido.');
    if(text.includes('_'+tag+'_')) throw new Error('Colisão de código: tente gerar novamente.');
    const selected=candidates.filter(c=>c.enabled).slice().sort((a,b)=>a.start-b.start);
    const mapping=[], keys=new Map(), byToken=new Map(), counters={}, chunks=[];
    let position=0;
    for(const c of selected) {
      if(!CATEGORIES[c.category] || c.start<position || text.slice(c.start,c.end)!==c.original) throw new Error('As marcações precisam ser atualizadas para este texto.');
      const key=JSON.stringify([c.category,c.original,c.exclusive?c.id:null]);
      let token=keys.get(key);
      if(!token) {
        counters[c.category]=(counters[c.category]||0)+1;
        token='['+c.category+'_'+tag+'_'+String(counters[c.category]).padStart(3,'0')+']';
        const entry={token,original:c.original,category:c.category,count:0};
        keys.set(key,token); mapping.push(entry); byToken.set(token,entry);
      }
      byToken.get(token).count++;
      chunks.push(text.slice(position,c.start),token); position=c.end;
    }
    chunks.push(text.slice(position));
    return {text:chunks.join(''),mapping,occurrences:selected.length};
  }
  function validate(text,mapping) {
    const map=new Map(mapping.map(m=>[m.token,m])), counts=new Map(), errors=[], knownSpans=[];
    const looks=/^(?:NOME[_ ]|ENDERE[CÇ]O|LOCALIDADE|EMAIL|E-MAIL|TELEFONE|CPF|CNPJ|RG[_ ]|DOCUMENTO|PRONTU[AÁ]RIO|PROTOCOLO|PROCESSO|CEP[_ ]|DATA[_ ]|HOR[AÁ]RIO|IDADE[_ ]|IDENTIFICADOR_DIGITAL|DADO_FINANCEIRO|TRECHO_SIGILOSO)/i;
    for(const m of text.matchAll(/\[[^\]\r\n]*\]/g)) {
      if(map.has(m[0])) { counts.set(m[0],(counts.get(m[0])||0)+1); knownSpans.push([m.index,m.index+m[0].length]); }
      else if(looks.test(m[0].slice(1))) errors.push({marker:m[0],reason:'Código desconhecido, alterado ou de outra sessão.'});
    }
    for(const m of text.matchAll(/\[[^\]\r\n]*(?=$|\r?\n)/g)) if(looks.test(m[0].slice(1))) errors.push({marker:m[0],reason:'Marcador sem colchete de fechamento.'});
    const cats=Object.keys(CATEGORIES).join('|');
    for(const m of text.matchAll(new RegExp('(?:'+cats+')_[A-Z0-9]{6,64}_[0-9]{3,}','gi'))) {
      if(!knownSpans.some(([a,b])=>m.index>a && m.index+m[0].length<b) && !errors.some(e=>e.marker.includes(m[0]))) errors.push({marker:m[0],reason:'Código alterado ou sem colchetes completos.'});
    }
    const missing=mapping.filter(m=>!counts.has(m.token));
    const changed=mapping.filter(m=>counts.has(m.token)&&counts.get(m.token)!==m.count);
    const masked=text.replace(/\[[^\]\r\n]*\]/g,m=>map.has(m)?' '.repeat(m.length):m);
    return {errors,missing,changed,counts:Object.fromEntries(counts),masked,valid:errors.length===0};
  }
  function restore(text,mapping,categories=null) {
    const check=validate(text,mapping);
    if(!check.valid) throw new Error('Corrija os códigos desconhecidos ou danificados antes de reinserir.');
    const map=new Map(mapping.map(m=>[m.token,m]));
    return text.replace(/\[[^\]\r\n]*\]/g,token=>{
      const entry=map.get(token);
      return entry && (!categories || categories.has(entry.category)) ? entry.original : token;
    });
  }
  const api={CATEGORIES,norm,tokenize,makeIndex,parsePrivate,detect,protect,validate,restore};
  root.SigiloEngine=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
