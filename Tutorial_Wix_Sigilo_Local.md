# SLSS (Sigilo Local Serviço Social): áudio e textos

Tutorial de instalação e teste - pacote v0.3.0 - 05/10/2026

## 1. Teste local: internet ligada ou desligada

Esta versão transcreve no dispositivo com IA local. Áudio, texto e mapa não são enviados a uma API. Você baixa primeiro os recursos públicos; durante o trabalho confidencial, o programa não baixa nada.

1. Baixe e extraia o ZIP completo. No Windows, clique com o botão direito e use **Extrair Tudo**.
2. Abra **SLSS_Offline.html** no navegador do computador. Desligar a internet é opcional; você pode testar conectado. Prefira Chrome ou Edge recente. Abra o arquivo extraído, não uma visualização dentro do ZIP.
3. Na aba **Áudio**, escolha **Carregar motor local** e selecione **Motor_Whisper_Local.sigilo**. Aguarde a mensagem **Motor local pronto**. Selecionar esse arquivo não faz upload.
4. Escolha **Selecionar áudio** e abra **exemplos/Audio_Ficticio_Portugues.wav**. Mantenha Português e clique em **Transcrever áudio localmente**.
5. Compare com **exemplos/Roteiro_Audio_Ficticio.txt**. Corrija erros, confirme a revisão e use **Levar transcrição à etapa Texto**.
6. Faça a varredura e siga o ciclo descrito na seção 3. Ao terminar, apague a sessão.

| Arquivo | Para que serve |
| --- | --- |
| SLSS_Offline.html | Programa para abrir no computador, inclusive sem internet. |
| Motor_Whisper_Local.sigilo | Motor e modelo públicos (Whisper small q8), aproximadamente 169 MB; selecionado localmente. O download é mais pesado que a versão anterior; avise os visitantes. |
| Codigo_Para_Colar_No_Wix.txt | Código completo de incorporação; não é um arquivo de áudio. |
| codigo_fonte/ | Fontes, licenças, testes e instruções para desenvolvimento. |

**Limites:** 100 MB e 30 minutos por áudio. Divida gravações maiores. O desempenho depende do computador. WAV e MP3 são opções de teste; outros formatos dependem do navegador. A transcrição não identifica participantes automaticamente.

**Qualidade:** o áudio fictício usa voz sintética. Em testes de desenvolvimento com fala real em português, o motor v0.3.0 errou cerca de 13,5% das palavras (o motor anterior, 21,4%). Ainda há erros em nomes, números e palavras. Confira com o áudio antes de qualquer registro profissional; funcionamento offline não comprova acurácia.

## 2. Instale o componente no Wix

### Editor Wix

1. Abra **Codigo_Para_Colar_No_Wix.txt** no Bloco de Notas. Use Ctrl+A e Ctrl+C para copiar tudo.
2. No editor do site, abra **Elementos > Incorporar código > Incorporações populares > HTML incorporado** [1].
3. Selecione a caixa, clique em **Inserir Código**, cole em **Adicione seu código aqui** e clique em **Aplicar** [1]. Use a aba Código, quando houver.
4. Ajuste a largura à página e comece com cerca de **1.500 px de altura** no computador. No celular, teste uma altura maior e a rolagem interna. São sugestões; ajuste até alcançar todos os botões.
5. Salve e teste em Visualizar. Depois de publicar, repita o teste fictício no endereço público.

O TXT deve ser colado inteiro, do início `<!doctype html>` ao fim `</html>`. Use o elemento visual de incorporação. Essa instalação dispensa Velo e hospedagem de outro site. O programa não recebe áudios por formulários, CMS ou Gerenciador de Mídia.

### Wix Studio

Use **Elementos > Incorporar e redes sociais > Incorporar código**. Clique em **Inserir código**, cole o TXT e confirme em **OK** [2]. Confira computador, tablet e celular. Os nomes dos menus podem variar conforme o editor.

### Disponibilize os recursos públicos

Adicione um botão **Baixar pacote para uso local**. O Wix oferece botão de download por **Link > Documento > Escolher arquivo** [3]. Se seu seletor aceitar o ZIP, envie apenas o pacote público do programa. Se restringir arquivos compactados, use a opção **Wix File Share**, indicada pela Wix para compartilhar outros formatos [4-5], e disponibilize o ZIP por ela.

Instrua o visitante a extrair o ZIP e selecionar **Motor_Whisper_Local.sigilo** em seu computador. O modelo fica separado do HTML por seu tamanho. Não crie um campo Wix de upload de áudio confidencial. O pacote público pode ser hospedado; gravações, transcrições e mapas não devem acompanhar esse pacote.

## 3. Confira o texto antes de compartilhar

A transcrição é uma etapa opcional. Você pode ir diretamente a **Texto** e colar uma transcrição já existente ou carregar o exemplo fictício de texto.

1. Revise a transcrição com o áudio, especialmente nomes, números, negativas e autoria das falas. Corrija o campo editável antes de continuar.
2. Em **Texto**, faça a varredura. Se necessário, use a lista privada para acrescentar nomes e instituições conhecidos da sessão.
3. Em **Revisar dados**, aceite ou rejeite sugestões e confira as categorias. Marque manualmente pistas contextuais que possam identificar alguém, como apelidos e características únicas. Para homônimos, use **Código exclusivo**.
4. Prepare o texto protegido. Leia todo o resultado e confirme a revisão para habilitar as cópias. Escolha um dos nove prompts. O mapa dos dados originais não acompanha a cópia.
5. Para testar sem enviar nada a um serviço externo, use **Usar texto protegido como retorno de teste**, **Conferir códigos** e **Reinserir dados selecionados**. O texto corrigido deve reaparecer.
6. Se usar uma IA externa, mantenha esta sessão aberta e preserve os códigos exatamente. Cole o retorno e confira. Revise a atribuição das informações antes de reinserir e salvar o resultado.
7. Ao concluir, use **Apagar todos os dados da sessão** e confirme. Depois de descartar o mapa, a reinserção não é mais possível.

Os prompts incluem correção gramatical, resumos, pauta, ata, minuta, evoluções e encaminhamentos. Eles orientam a IA a preservar códigos e não inventar informações, mas não garantem que a IA obedeça ou atribua corretamente as falas.

A detecção por nomes e regras tem limites. É responsabilidade do usuário revisar e anonimizar adequadamente o material antes de compartilhar, incluindo informações identificadoras no contexto. Mantenha os avisos de respeito à LGPD e às normas do conjunto CFESS/CRESS, com reconhecimento desses limites.

## 4. Entenda o alcance da privacidade

**No componente:** o áudio é decodificado no navegador e reconhecido por um motor local. O texto e o mapa permanecem na sessão. O código não implementa envio desses conteúdos a servidores, ao CMS ou à página externa por postMessage. O worker troca mensagens somente com o próprio componente.

**Recursos públicos:** o modelo e o motor estão no arquivo selecionado. O programa verifica seu SHA-256 antes de executá-lo. Durante a sessão, não busca modelo em CDN, não usa reconhecimento de fala em nuvem e não envia áudio como alternativa quando há erro. A política de conteúdo bloqueia conexões externas e permite recursos blob locais em memória.

**No site Wix:** as configurações da página externa, cookies, métricas e apps pertencem à plataforma e ao administrador do site. A afirmação de processamento local se refere ao componente. Para trabalhar sem conexão durante toda a sessão, use o HTML baixado e mantenha a rede desligada.

**Ao apagar:** o programa encerra os workers, limpa campos e suas instâncias de histórico de edição, descarta mapa e lista privada e invalida respostas pendentes. Não mantém a sessão em armazenamento persistente do navegador. Recarregar ou sair também pode perder o mapa; planeje a reinserção antes disso.

A limpeza não apaga o áudio original em disco, downloads já salvos, a área de transferência ou conteúdo enviado a outra IA. Ela não garante eliminação forense da memória. O programa não controla extensões, o sistema operacional ou outros aplicativos. Portanto, não há garantia absoluta de ausência de vazamento em todo o dispositivo.

As medidas são feitas no intuito de respeito à LGPD e às normas profissionais aplicáveis. O protótipo não é uma certificação de conformidade nem substitui a responsabilidade profissional e as obrigações de quem trata os dados.

## 5. Problemas, atualização e validação

| Situação | O que fazer |
| --- | --- |
| O motor não inicia ou é bloqueado | Extraia o ZIP, use o motor desta mesma versão e tente o HTML local em navegador recente. Não há alternativa em servidor. |
| O programa diz que o motor foi alterado | Baixe novamente o pacote original. O hash impede executar um motor diferente do previsto. |
| O áudio não é decodificado | Tente WAV ou MP3. Converta localmente, em ferramenta do computador, preservando o sigilo. |
| Aviso de repetição ou reconhecimento interrompido | O motor tenta novamente localmente. Persistindo a falha, descarta a saída suspeita e indica o trecho. Confira o idioma e teste uma gravação curta com fala clara. |
| Palavras trocadas ou fala omitida | A detecção de repetição não detecta todos os erros. Compare com o áudio e corrija antes de continuar. |
| Cópia ou download é bloqueado no iframe | Use o campo de cópia ou salvamento manual oferecido pelo componente. |
| A varredura sem worker indica limite | Divida o texto em partes de até 100 mil caracteres; complete cada ciclo na própria sessão. |
| Códigos danificados ou de outra sessão | Corrija a grafia ou volte à sessão original. O programa não restaura por aproximação; mapa apagado não é recuperável. |

Para atualizar, finalize as sessões ativas, substitua todo o código da incorporação pelo novo TXT e distribua o motor correspondente. Teste novamente antes de publicar. Código e motor de versões diferentes podem ser recusados.

**Validação realizada:** 15 testes de texto, 19 de DOM, 9 verificações de repetição e 5 cenários controlados de decodificação. Em Chromium 133, também foram verificadas as barreiras de revisão e limpeza com saídas repetitivas controladas. Testes reais de navegador offline: transcrição do áudio fictício, correção manual, proteção e reinserção, cancelamento, limpeza e rejeição de motor alterado. A incorporação simulada também verificou silêncio, arquivo inválido, ausência de postMessage para o pai e nenhuma requisição HTTP/HTTPS. Não se acessou sua conta nem se testou uma página real do seu Wix. Não é auditoria de segurança ou avaliação de acurácia em reuniões.

### Referências oficiais consultadas em 03/10/2026

[1] Wix. Editor Wix: incorporar um site ou widget. https://support.wix.com/pt/article/editor-wix-incorporando-um-site-ou-widget

[2] Wix. Editor do Wix Studio: adicionar um elemento iFrame HTML. https://support.wix.com/pt/article/editor-do-wix-studio-adicionar-um-elemento-iframe-html

[3] Wix. Adding a Download Button. https://support.wix.com/en/article/wix-editor-adding-a-download-button

[4] Wix. Supported Media File Types and File Sizes. https://support.wix.com/en/article/wix-media-supported-media-file-types-and-file-sizes

[5] Wix. Supported File Types for the Wix File Share App. https://support.wix.com/en/article/wix-apps-supported-file-types-for-the-wix-file-share-app
