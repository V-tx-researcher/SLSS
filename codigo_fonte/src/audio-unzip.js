/* Descompactação de arquivos públicos, após verificar SHA-256. */
import {unzipSync} from 'fflate';
globalThis.SigiloUnzip = unzipSync;
