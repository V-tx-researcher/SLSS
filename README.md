# SLSS — Sigilo Local Serviço Social

> **EN:** Free and open-source tool for transcribing audio on your own computer, reviewing personal data, reversibly pseudonymizing texts and re-inserting them after an external AI step. Audio and texts are not sent to servers.

Ferramenta gratuita e de código aberto para transcrever áudio **no seu computador**, revisar e proteger dados pessoais, preparar prompts para uma IA externa e reinserir os dados originais na mesma sessão.

Criada para profissionais de Serviço Social, com foco no sigilo profissional. Ela não substitui a revisão do profissional nem garante anonimização.

---

## O que faz

- **Transcrição local de áudio** com Whisper small (multilíngue, quantizado q8) em ONNX Runtime Web, num worker local, sem GPU e sem enviar o áudio a lugar algum.
- **Áudios longos** são divididos automaticamente em partes de cerca de 5 minutos, com corte em pausas. As partes são transcritas em sequência e o texto é devolvido unido. Se uma parte não puder ser transcrita, ela aparece marcada como `[trecho não transcrito: mm:ss a mm:ss]`.
- **Revisão de dados:** detecção por regras e dicionários de nomes, instituições, endereços, e-mails, telefones e documentos, com revisão manual por ocorrência.
- **Pseudonimização reversível:** códigos únicos por sessão e categoria, como `[NOME_PESSOA_..._001]`, que permitem reinserir os dados depois.
- **Prompts prontos** para correção, resumos, pauta, ata, minuta, evolução profissional e encaminhamentos. Eles pedem que a IA preserve os códigos e não invente fatos.
- **Reinserção** da resposta da IA na mesma sessão, com validação dos códigos.
- **Limpeza da sessão** com um botão que encerra os workers e descarta campos, listas e o mapa.

## O que ele não faz

- Não identifica participantes automaticamente nem separa falantes.
- Não garante reconhecimento correto: o modelo pode omitir, trocar ou inventar palavras, sobretudo com ruído, silêncio ou falas sobrepostas. **Sempre confira a transcrição com o áudio.**
- Não detecta todos os dados sensíveis. A detecção automática não comprova anonimização.
- Não é certificação de conformidade com a LGPD nem com as normas do CFESS/CRESS. Ele apenas adota medidas que buscam respeitar essas normas, e o profissional continua responsável pela revisão antes de enviar qualquer texto a uma IA externa.

## Privacidade

- Áudio, transcrição, textos originais, listas privadas e o mapa de correspondências são processados **no dispositivo**. Não há envio para APIs, servidores, telemetria ou logs remotos.
- Nenhum conteúdo é gravado em `localStorage`, `sessionStorage`, `IndexedDB`, Cache API ou service worker.
- O motor e o modelo são lidos do arquivo escolhido pelo usuário e verificados por tamanho e SHA-256 antes da execução.
- A política de conteúdo (CSP) bloqueia conexões externas. Modelos remotos e caches persistentes estão desativados.
- A limpeza não apaga arquivos já baixados, a área de transferência, o áudio original em disco nem dados que você já tenha enviado a outro serviço.

## Como usar

O programa é um único arquivo HTML que abre no navegador (Chrome ou Edge recentes) sem servidor.

1. **Extraia o ZIP completo** (não abra os arquivos de dentro do ZIP).
2. Abra **`SLSS_Offline.html`** no navegador.
3. Na aba **Áudio** (opcional), clique em **Carregar motor local** e selecione **`Motor_Whisper_Local.sigilo`**. O programa verifica o arquivo antes de usar. Esse arquivo não é enviado a ninguém.
4. Escolha um áudio, confirme o idioma e clique em **Transcrever áudio localmente**. Também é possível colar uma transcrição existente direto na aba **Texto**.
5. Revise a transcrição, marque a revisão e leve o texto à etapa **Texto**.
6. Faça a varredura, revise as sugestões e as pistas contextuais e gere o texto protegido.
7. Copie o texto protegido e o prompt escolhido para a IA de sua preferência, e depois cole a resposta na etapa **Reinserir dados**.
8. Ao terminar, clique em **Apagar todos os dados da sessão**.

Para testar sem dados reais, use o áudio e o roteiro fictícios em `exemplos/`.

## Limites técnicos

- Áudio de até **250 MB** e **90 minutos**. Formatos recomendados: WAV e MP3. Outros formatos dependem do navegador.
- O navegador decodifica o arquivo inteiro antes de dividi-lo. Áudios longos exigem memória livre; em computadores com pouca memória, use partes menores.
- O motor tem cerca de **169 MB**. Ele é lido do seu computador; o programa não o baixa durante o uso.
- Texto de até 1 milhão de caracteres. Listas privadas de nomes ou instituições (TXT, CSV ou TSV) de até 3 MB.
- A base de nomes e instituições é ampla, mas não é exaustiva. Ela pode ser ampliada com fontes redistribuíveis e licenças compatíveis.

## Motor de transcrição

- Modelo: `onnx-community/whisper-small`, revisão `36050c46d777d46dc4b5f43f6d90574fc38f8732`, quantizado q8 (ONNX). Modelo original: `openai/whisper-small`.
- Runtime: ONNX Runtime Web 1.22.0-dev, `@huggingface/transformers` 3.8.1, um thread, WASM.
- Em um teste de desenvolvimento com 186 segundos de fala real em português (trechos do FLEURS pt_br, CC-BY 4.0, usados só para avaliação e não distribuídos), a taxa de erro de palavras foi de **13,5%**, contra 21,4% do modelo anterior (base). Em um áudio de 13 minutos dividido em partes, a taxa foi de **14,0%**. Esses números não representam reuniões reais.

## Instalação no Wix

O tutorial completo está em **`Tutorial_Wix_Audio_Sigilo_Local.pdf`** (ou `Tutorial_Wix_Sigilo_Local.md`). Em resumo:

- Cole o conteúdo de **`Codigo_Para_Colar_No_Wix.txt`** em um elemento HTML incorporado (Incorporar código) de uma página do Wix.
- O programa roda no navegador do visitante. O Wix não recebe áudio, texto nem resultados.
- O motor precisa ser baixado separadamente pelo visitante e selecionado no programa.
- Teste com o exemplo fictício na página publicada antes de usar material confidencial.

## Estrutura do pacote

```
SLSS_Offline.html                  programa para abrir no computador
SLSS_Wix.html                      versão de referência para incorporação
Codigo_Para_Colar_No_Wix.txt       código para colar no Wix
Motor_Whisper_Local.sigilo         motor e modelo públicos (~169 MB)
Tutorial_Wix_Audio_Sigilo_Local.pdf / Tutorial_Wix_Sigilo_Local.md
exemplos/                          áudio e roteiro fictícios
Validacao_*.json                   registros das validações desta versão
codigo_fonte/                      fontes, build, testes e licenças
```

## Desenvolvimento e reconstrução

O código em `codigo_fonte/` é MIT. Modelo e bibliotecas mantêm suas próprias licenças, descritas em `NOTICE.md` e copiadas em `LICENSES/`.

Para alterar interface, textos ou estilos, edite os arquivos em `src/` e execute:

```sh
python build.py
```

Python 3.10 ou superior é suficiente para gerar os HTML e o TXT. Como a política de conteúdo depende dos hashes dos scripts e do estilo, `build.py` precisa ser executado depois de qualquer alteração.

Para reconstruir o motor de áudio, na pasta `codigo_fonte/`:

```sh
python unpack_motor.py ../Motor_Whisper_Local.sigilo
npm ci --ignore-scripts
npm run build:audio
python package_motor.py
python build.py
```

Se o motor mudar, distribua o novo `.sigilo` junto com os HTML e o TXT gerados. Um motor com outro hash não será aceito pelo programa.

Testes:

```sh
npm test                 # motor de texto
npm run test:ui          # interface (DOM simulado)
npm run test:audio       # repetição, término e divisão em partes
npm run test:audio-ui    # controles de áudio no navegador
npm run test:browser     # fluxo completo no Chromium (requer npx playwright install chromium)
npm run test:iframe      # incorporação em iframe com sandbox
```

Os testes não medem acurácia de reconhecimento nem substituem uma auditoria de segurança. Para uso institucional, faça uma avaliação própria.

## Autor e licença

- Autor: Vinícius Araújo Pereira, pesquisador em Serviço Social. ORCID: https://orcid.org/0000-0003-3118-7069
- Código: MIT (ver `codigo_fonte/LICENSE`). Para citar, use `codigo_fonte/CITATION.cff`.
- Modelo e bibliotecas: ver `codigo_fonte/NOTICE.md` e a pasta `codigo_fonte/LICENSES/`.
- O áudio e o roteiro de exemplo são fictícios e foram gerados para este teste. Não representam gravações reais.
