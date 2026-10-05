# Créditos e licenças

O código do Sigilo Local é MIT. Os recursos de terceiros conservam suas próprias licenças, copiadas em LICENSES/ e no arquivo do motor.

| Recurso | Origem e versão | Licença |
| --- | --- | --- |
| Modelo de fala | onnx-community/whisper-small, revisão 36050c46d777d46dc4b5f43f6d90574fc38f8732; derivado de openai/whisper-small; ONNX q8 | Apache-2.0 indicada no cartão do modelo-base (LICENSES/Whisper-Small-ONNX-Model-Card.md) |
| Código Whisper original | openai/whisper | MIT |
| Transformers.js | @huggingface/transformers 3.8.1 | Apache-2.0 |
| ONNX Runtime Web / Common | 1.22.0-dev.20250409-89f8206ba4 | MIT |
| Jinja JavaScript | @huggingface/jinja 0.5.10 | MIT |
| Descompactação | fflate 0.8.2 | MIT |
| Dicionários | Faker 40.40.0, seleção multilíngue | MIT |

Os hashes dos arquivos do modelo estão em model/proveniencia.json dentro do motor. O hash de todo o motor é incorporado ao HTML e verificado antes da execução. Os arquivos do runtime ONNX são distribuídos sem alterações; um adaptador do projeto permite carregá-los de URLs blob em memória.

Os endereços de origem servem para rastreabilidade e reconstrução. O aplicativo não acessa essas origens durante o uso. Baixar o pacote ou preparar dependências públicas é uma etapa anterior ao uso confidencial.

O áudio fictício foi sintetizado localmente com eSpeak-NG. O sintetizador não é distribuído nem utilizado pelo aplicativo. O roteiro foi criado para este teste; nomes e fatos são fictícios. Não representa uma gravação real nem um teste de acurácia de reuniões.
