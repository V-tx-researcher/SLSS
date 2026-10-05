# v0.4.0 - 05/10/2026

- Áudios longos são divididos automaticamente em partes de até 5 minutos, com corte no ponto de menor energia até 12 s antes ou depois do limite (silêncio de preferência). Cada parte é transcrita em sequência e o texto é unido.
- Falha em uma parte não descarta o restante: a parte aparece como [trecho não transcrito: mm:ss a mm:ss] e a interface lista os intervalos. Se nenhuma parte for utilizável, a interface continua declarando que não há transcrição utilizável.
- Limites ampliados: 250 MB e 90 minutos por arquivo (antes 100 MB e 30 minutos). Os limites seguem a memória do navegador: o arquivo inteiro é decodificado antes da divisão.
- Testes novos: divisão em partes, corte em pausa, transcrição parcial com falha isolada e falha total.

# v0.3.0 - 05/10/2026

- Motor trocado de Whisper base q8 para Whisper small multilíngue q8 (revisão 36050c46d777d46dc4b5f43f6d90574fc38f8732), com o mesmo runtime público, o mesmo worker e as mesmas barreiras de rede.
- Medição de desenvolvimento em 186 s de fala real em português (FLEURS pt_br, CC-BY 4.0, não distribuído): taxa de erro de palavras de 21,4% (base) para 13,5% (small), no HTML final e sem requisições externas.
- Motor empacotado com novo hash e tamanho (audio-config.json); procedência registrada em motor/model/proveniencia.json. O ZIP fica maior (cerca de 169 MB de motor).
- Limitação conhecida: a detecção de repetição e término continua descartando o áudio inteiro quando um trecho falha duas vezes. Ainda não há recuperação parcial por trecho.

# v0.2.1 - 05/10/2026

- Detecção por trecho de repetição excessiva e geração interrompida, parada antecipada de ciclos e limite de tokens conforme a duração.
- Uma nova tentativa local com ajuste leve de decodificação; persistindo a falha, a saída suspeita não é transferida e o intervalo é indicado.
- Validação adicional da saída na interface e aviso dos trechos refeitos. Transcrição manual conferida continua disponível.
- Testes de regressão de repetição, término, revisão e limpeza; motor e HTML atualizados juntos.
- Tutorial esclarece que desconectar a internet para testar é opcional.

# v0.2.0 - 03/10/2026

- Transcrição de áudio no dispositivo com Whisper base q8 e runtime público empacotado. Sem API, CDN, telemetria ou alternativa de transcrição em servidor.
- Verificação SHA-256 do motor antes de executá-lo, worker clássico para abrir o HTML local, adaptador de WASM em memória e CSP sem conexões externas.
- Revisão e edição de transcrição antes da transferência à etapa de texto, progresso, cancelamento e limpeza também do motor e do áudio.
- HTML para uso offline, instalação Wix, áudio fictício em português e tutorial atualizado.
- Testes reais em Chromium offline e incorporação simulada; qualidade não validada para reuniões profissionais e revisão obrigatória.

# Histórico

## 0.1.1 - 03/10/2026

- Pacote para colar diretamente em um elemento HTML incorporado do Wix, com HTML e TXT de conteúdo idêntico.
- Alternativa local de varredura quando o worker é bloqueado na construção ou durante sua execução, até 100 mil caracteres.
- Campo de salvamento manual em exportações da versão incorporada; limpeza dos campos de cópia e exportação.
- Avisos que distinguem o processamento do componente das configurações e serviços do site Wix.
- Tutorial para Editor Wix, Wix Studio e Harmony, com dimensionamento, testes e atualização.
- Testes de integração para worker indisponível, falha assíncrona, limite de caracteres, clipboard negado e exportação incorporada.

## 0.1.0 - 02/10/2026

- Primeiro protótipo de texto: detecção determinística, revisão manual, lista privada, códigos reversíveis, nove prompts e descarte da sessão.
