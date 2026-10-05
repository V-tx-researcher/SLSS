/* Sigilo Local - indícios de falha, não uma medição de acurácia. MIT. */
(function(root){
  'use strict';
  // Repetir algumas palavras pode fazer parte da fala. Só sinalizamos sequências
  // longas e consecutivas; não apagamos palavras nem corrigimos o que foi dito.
  function repeated(items, minimum=24, periods=12){
    if(items.length<minimum)return false;
    for(let period=1;period<=Math.min(periods,Math.floor(items.length/6));period++){
      let equal=0;
      for(let i=period;i<items.length;i++){
        equal=items[i]===items[i-period]?equal+1:0;
        if(equal+period>=minimum && equal+period>=6*period)return true;
      }
    }
    return false;
  }
  function inspectText(text){
    const words=String(text).normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
    return repeated(words)?'repetition':null;
  }
  function inspectTokens(ids,eos){
    // Os marcadores de idioma e tempo do Whisper estão acima do token de fim.
    const words=ids.map(Number).filter(id=>id>=0&&id<eos);
    if(repeated(words,32,24))return 'repetition';
    if(ids.length && Number(ids.at(-1))!==eos)return 'incomplete';
    return null;
  }
  // Divide o áudio em partes de cerca de targetSeconds. Cada corte é movido para o
  // ponto de menor energia até searchSeconds antes ou depois do limite nominal, para
  // não cortar uma palavra no meio. Sem silêncio, usa o ponto de menor energia mesmo assim.
  function planSegments(samples, rate, targetSeconds, searchSeconds){
    const target=Math.round(rate*targetSeconds), search=Math.round(rate*searchSeconds), half=Math.round(rate/8);
    const segments=[];
    let start=0;
    while(samples.length-start>target*1.25){
      const nominal=start+target;
      const low=Math.max(start+half,nominal-search), high=Math.min(samples.length-half,nominal+search);
      let cut=nominal, best=Infinity;
      for(let center=low;center<=high;center+=half){
        let energy=0;
        for(let i=center-half;i<center+half;i++)energy+=samples[i]*samples[i];
        if(energy<best){best=energy;cut=center;}
      }
      segments.push({start,end:cut});
      start=cut;
    }
    segments.push({start,end:samples.length});
    return segments;
  }
  const api={repeated,inspectText,inspectTokens,planSegments};
  root.SigiloAudioQuality=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
