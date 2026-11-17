// Loads .env from the repo root into process.env. Imported first by index.mjs so that
// modules reading their settings at import time see the values.
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
