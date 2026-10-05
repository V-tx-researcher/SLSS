/* Sigilo Local — controle de áudio sem upload, gravação ou armazenamento. MIT. */
(function(){
  'use strict';
  globalThis.SigiloAudio = {create({toast,transfer}){
    const $=id=>document.getElementById(id);
    const config=JSON.parse($('audio-config').textContent);
    // Limites de memória do navegador: o áudio inteiro é decodificado antes de ser dividido em partes.
    const MAX_BYTES=250*1024*1024, MAX_SECONDS=5400;
    const clock=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
    let worker=null,workerURL=null,generation=0,ready=false,working=false,loadTimer=null;
    function status(text){$('audioStatus').textContent=text;}
    function refresh(){
      $('transcribeButton').disabled=!ready||working||!$('audioFile').files.length;
      $('cancelAudio').disabled=!working;
      $('motorFile').disabled=working;
      $('audioFile').disabled=working;
      $('audioLanguage').disabled=working;
      $('audioText').disabled=working;
      $('audioReviewed').disabled=working;
      $('useTranscript').disabled=working||!$('audioText').value.trim()||!$('audioReviewed').checked;
    }
    function stop(){
      clearTimeout(loadTimer);loadTimer=null;
      if(worker)worker.terminate();worker=null;
      if(workerURL)URL.revokeObjectURL(workerURL);workerURL=null;
      ready=false;working=false;
    }
    function resetReview(){$('audioReviewed').checked=false;refresh();}
    function clearIssue(){$('audioIssue').hidden=true;$('audioIssue').textContent='';}
    function qualityFailure(data){
      working=false;$('audioText').value='';resetReview();
      const range=Number.isFinite(data.start)&&Number.isFinite(data.end)?' no trecho '+clock(data.start)+' a '+clock(data.end):'';
      const reason=data.reason==='incomplete'?'o reconhecimento não terminou':'houve repetição excessiva';
      const message='Possível falha de transcrição'+range+': '+reason+'. O resultado suspeito não foi aproveitado. Confira o idioma e teste uma gravação curta com fala clara. Você também pode digitar aqui uma transcrição conferida com o áudio.';
      $('audioIssue').textContent=message;$('audioIssue').hidden=false;
      $('audioProgress').value=0;status('Não foi possível concluir uma transcrição utilizável.');refresh();
    }
    function wipe(buffer){try{new Uint8Array(buffer).fill(0);}catch(_){} }
    function fail(message){stop();$('audioProgress').removeAttribute('value');status(message);refresh();toast(message);}
    function finish(data){
      if(SigiloAudioQuality.inspectText(data.text)){qualityFailure({reason:'repetition'});return;}
      working=false;
      clearIssue();
      $('audioText').value=data.text;
      resetReview();
      $('audioProgress').value=100;
      status(data.silence?'Nenhuma fala: silêncio digital detectado.':data.text.trim()?'Transcrição concluída neste dispositivo. Confira o texto antes de continuar.':'Nenhuma palavra foi reconhecida. Confira o idioma e teste outro áudio WAV ou MP3.');
      const notes=[];
      if(data.parts>1)notes.push('O áudio foi dividido em '+data.parts+' partes e transcrito em sequência.');
      if(data.failures&&data.failures.length)notes.push('Não foi possível transcrever '+data.failures.length+' parte(s), nos intervalos '+data.failures.map(f=>clock(f.start)+' a '+clock(f.end)).join(', ')+'. Elas aparecem marcadas no texto como [trecho não transcrito]. Ouça esses trechos e digite-os manualmente, se necessário; nada foi inventado para preencher a lacuna.');
      if(data.retried)notes.push('O motor refez '+data.retried+' trecho(s) após detectar um possível erro. Confira esses trechos com o áudio.');
      if(notes.length){$('audioIssue').textContent=notes.join(' ')+' Esta verificação não comprova acurácia.';$('audioIssue').hidden=false;}
      refresh();
    }
    async function loadMotor(input){
      const file=input.files[0];if(!file)return;
      generation++;const run=generation;stop();clearIssue();$('audioText').value='';resetReview();working=true;refresh();
      status('Verificando o arquivo público do motor…');$('audioProgress').removeAttribute('value');
      try{
        if(file.size!==config.size)throw new Error('Use o motor que acompanha esta versão do programa.');
        if(!crypto.subtle)throw new Error('A verificação do motor exige um navegador recente em HTTPS ou o HTML local.');
        const bytes=await file.arrayBuffer();if(run!==generation)return;
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
        if(run!==generation)return;
        if(hash!==config.sha256)throw new Error('O motor foi alterado ou está incompleto. Use o arquivo original do pacote.');
        const files=SigiloUnzip(new Uint8Array(bytes));
        workerURL=URL.createObjectURL(new Blob([files['worker.js']],{type:'text/javascript'}));
        worker=new Worker(workerURL);
        loadTimer=setTimeout(()=>{if(run===generation&&!ready)fail('O motor local não iniciou. Tente o HTML baixado em outro navegador recente.');},120000);
        worker.onmessage=({data})=>{
          if(run!==generation)return;
          if(data.type==='ready'){clearTimeout(loadTimer);loadTimer=null;ready=true;working=false;$('audioProgress').value=100;status('Motor local pronto. Selecione o áudio e clique em Transcrever.');refresh();}
          else if(data.type==='status')status(data.label);
          else if(data.type==='progress'){$('audioProgress').value=100*data.completed/data.total;status('Transcrevendo localmente: trecho '+data.completed+' de '+data.total+'.');}
          else if(data.type==='done')finish(data);
          else if(data.type==='quality-error')qualityFailure(data);
          else if(data.type==='error')fail('Não foi possível '+(data.stage==='init'?'preparar o motor':'transcrever o áudio')+' neste navegador. Tente o HTML local em um computador.');
        };
        worker.onerror=()=>{if(run===generation)fail('O navegador bloqueou ou interrompeu o motor local. Tente o HTML baixado em um navegador recente.');};
        const buffers=[...new Set(Object.values(files).map(f=>f.buffer))];
        worker.postMessage({type:'init',files},buffers);
      }catch(error){if(run===generation)fail(error.message||'Não foi possível abrir o motor local.');}
      finally{input.value='';}
    }
    async function transcribe(){
      const file=$('audioFile').files[0];if(!file||!ready||working)return;
      if(file.size>MAX_BYTES){toast('Use um áudio de até 250 MB e 90 minutos. Divida gravações maiores.');return;}
      const run=generation;working=true;clearIssue();$('audioText').value='';resetReview();refresh();
      status('Decodificando o áudio neste dispositivo…');$('audioProgress').removeAttribute('value');
      let encoded=null,decoded=null,mono=null;
      try{
        encoded=await file.arrayBuffer();if(run!==generation)return;
        const OfflineContext=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
        if(!OfflineContext)throw new Error('Este navegador não oferece decodificação local de áudio.');
        decoded=await new OfflineContext(1,1,16000).decodeAudioData(encoded);
        encoded=null;if(run!==generation)return;
        if(decoded.sampleRate!==16000)throw new Error('O navegador não converteu o áudio para 16 kHz. Tente WAV ou MP3 em outro navegador recente.');
        if(decoded.duration>MAX_SECONDS)throw new Error('O áudio ultrapassa 90 minutos. Divida a gravação em partes menores.');
        mono=new Float32Array(decoded.length);
        for(let ch=0;ch<decoded.numberOfChannels;ch++){
          const channel=decoded.getChannelData(ch);
          for(let i=0;i<mono.length;i++)mono[i]+=channel[i]/decoded.numberOfChannels;
        }
        if(run!==generation)return;
        status('Reconhecendo a fala neste dispositivo. A primeira transcrição pode demorar…');
        worker.postMessage({type:'transcribe',samples:mono,language:$('audioLanguage').value},[mono.buffer]);
        mono=null;
      }catch(error){if(run===generation){working=false;status(error.message||'Formato de áudio não decodificado. Tente um arquivo WAV ou MP3.');refresh();toast($('audioStatus').textContent);}}
      finally{
        if(encoded)wipe(encoded);
        if(mono)mono.fill(0);
        if(decoded)for(let ch=0;ch<decoded.numberOfChannels;ch++)decoded.getChannelData(ch).fill(0);
        encoded=decoded=mono=null;
      }
    }
    function clear(){
      generation++;stop();clearIssue();$('audioText').value='';$('audioReviewed').checked=false;
      $('motorFile').value='';$('audioFile').value='';$('audioLanguage').value='portuguese';
      $('audioProgress').value=0;status('Carregue o motor público do pacote. O arquivo será lido no seu dispositivo.');refresh();
    }
    document.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.id==='transcribeButton')transcribe();
      else if(button.id==='cancelAudio'){
        generation++;stop();clearIssue();$('audioText').value='';resetReview();$('audioProgress').value=0;
        status('Operação cancelada. Carregue novamente o motor para continuar.');refresh();
      }else if(button.id==='useTranscript'&&!button.disabled)transfer($('audioText').value);
    });
    document.addEventListener('change',event=>{
      if(event.target.id==='motorFile')loadMotor(event.target);
      else if(event.target.id==='audioFile'){
        clearIssue();$('audioText').value='';resetReview();
        if(event.target.files[0]?.size>MAX_BYTES){event.target.value='';toast('O limite desta versão é 250 MB por arquivo.');}
        refresh();
        if(event.target.files.length)status(ready?'Áudio selecionado neste dispositivo. Clique em Transcrever.':'Áudio selecionado. Carregue o motor local para começar.');
      }else if(event.target.id==='audioReviewed')refresh();
      else if(event.target.id==='audioLanguage')resetReview();
    });
    document.addEventListener('input',event=>{if(event.target.id==='audioText')resetReview();});
    clear();
    return {clear};
  }};
})();
