// Text to speech with Piper (https://github.com/OHF-voice/piper1-gpl), run as a separate process.
// Setup, once, from the repo root:
//   python -m venv .venv-piper
//   .venv-piper/Scripts/python -m pip install piper-tts        (bin/python on Linux and macOS)
//   .venv-piper/Scripts/python -m piper.download_voices --download-dir voices es_MX-claude-high
// Results are cached on disk by a hash of voice, speed and text, so each phrase is synthesized once.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, readdir, rename, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const voicesDir = path.join(repoRoot, 'voices');
const cacheDir = path.join(repoRoot, '.cache', 'tts');
const python = [
    path.join(repoRoot, '.venv-piper', 'Scripts', 'python.exe'),
    path.join(repoRoot, '.venv-piper', 'bin', 'python')
].find(candidate => existsSync(candidate));

const MAX_TEXT_LENGTH = 400;
const SPEEDS = {normal: 1, lenta: 1.2};

class TtsError extends Error {
    constructor (status, message) {
        super(message);
        this.status = status;
    }
}

const listVoices = async () => {
    if (!python) return [];
    try {
        return (await readdir(voicesDir))
            .filter(name => name.endsWith('.onnx'))
            .map(name => name.slice(0, -'.onnx'.length))
            .sort();
    } catch {
        return [];
    }
};

// Piper loads the voice model on every run; one run at a time keeps the PC responsive.
let queue = Promise.resolve();

const runPiper = (text, voice, lengthScale, outputPath) => new Promise((resolve, reject) => {
    const child = spawn(python, [
        '-m', 'piper',
        '-m', voice,
        '--data-dir', voicesDir,
        '--length-scale', String(lengthScale),
        '-f', outputPath
    ], {
        stdio: ['pipe', 'ignore', 'pipe'],
        // Without UTF-8 mode, Python on Windows reads stdin in the system code page and garbles accents.
        env: {...process.env, PYTHONUTF8: '1'}
    });
    let stderr = '';
    child.stderr.on('data', chunk => {
        stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', code => {
        if (code === 0) {
            resolve();
        } else {
            reject(new Error(`piper exited with code ${code}: ${stderr.slice(-500)}`));
        }
    });
    child.stdin.end(text, 'utf8');
});

/**
 * @param {object} request - what to say
 * @param {string} request.text - the phrase
 * @param {string} request.voice - a voice name from listVoices()
 * @param {string} [request.speed] - 'normal' or 'lenta'
 * @returns {Promise<string>} path of a WAV file
 */
const synthesize = async ({text, voice, speed = 'normal'}) => {
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
        throw new TtsError(400, `"text" must be 1 to ${MAX_TEXT_LENGTH} characters`);
    }
    if (!Object.hasOwn(SPEEDS, speed)) {
        throw new TtsError(400, `"speed" must be one of: ${Object.keys(SPEEDS).join(', ')}`);
    }
    const voices = await listVoices();
    if (!voices.includes(voice)) {
        throw new TtsError(voices.length ? 400 : 503,
            voices.length ? `Unknown voice. Installed: ${voices.join(', ')}` : 'Piper is not set up; see server/tts.mjs');
    }

    const phrase = text.trim().replace(/\s+/g, ' ');
    const hash = createHash('sha256').update(JSON.stringify([voice, speed, phrase]))
        .digest('hex');
    const wavPath = path.join(cacheDir, `${hash}.wav`);
    const isCached = () => stat(wavPath).then(() => true, () => false);
    if (await isCached()) return wavPath;

    const job = queue.then(async () => {
        if (await isCached()) return;
        await mkdir(cacheDir, {recursive: true});
        // Written under a temporary name so a half-written file is never served.
        const temporaryPath = `${wavPath}.${process.pid}.tmp`;
        await runPiper(phrase, voice, SPEEDS[speed], temporaryPath);
        await rename(temporaryPath, wavPath);
    });
    queue = job.catch(() => {});
    await job;
    return wavPath;
};

export {TtsError, listVoices, synthesize};
