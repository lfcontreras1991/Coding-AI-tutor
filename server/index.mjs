// Home server for the block tutor: one process, one port, no dependencies.
//   /            editor build (packages/scratch-gui/build-embedded)
//   /lessons/*   lesson project files and starter projects
//   /pruebas/*   device test pages
//   /api/test-tone.wav   short chime generated in memory, for the audio test
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 8601;
// The full editor: every block, sprite and tab. Lessons opt in with &project=/lessons/<id>/project.json
const START_PAGE = '/editor.html?locale=es-419';

const mounts = [
    ['/lessons/', path.join(repoRoot, 'lessons')],
    ['/pruebas/', path.join(repoRoot, 'server', 'public')],
    ['/', path.join(repoRoot, 'packages', 'scratch-gui', 'build-embedded')]
];

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.sb3': 'application/octet-stream',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.wav': 'audio/wav',
    '.woff2': 'font/woff2'
};

// Three rising notes as 16-bit mono PCM.
const makeChime = () => {
    const sampleRate = 22050;
    const notes = [523.25, 659.25, 783.99];
    const noteSamples = Math.floor(sampleRate * 0.35);
    const data = Buffer.alloc(notes.length * noteSamples * 2);
    notes.forEach((frequency, noteIndex) => {
        for (let i = 0; i < noteSamples; i++) {
            const fade = Math.min(1, i / 200, (noteSamples - i) / 2000);
            const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5 * fade;
            data.writeInt16LE(Math.round(sample * 32767), ((noteIndex * noteSamples) + i) * 2);
        }
    });
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(data.length, 40);
    return Buffer.concat([header, data]);
};
const chime = makeChime();

const resolveFile = pathname => {
    for (const [prefix, directory] of mounts) {
        if (!pathname.startsWith(prefix)) continue;
        const filePath = path.join(directory, pathname.slice(prefix.length));
        // path.join normalizes "..", so anything outside the mount is rejected here
        if (filePath !== directory && !filePath.startsWith(directory + path.sep)) return null;
        return filePath;
    }
    return null;
};

const server = http.createServer(async (request, response) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
        response.writeHead(400).end('Bad request');
        return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end('Method not allowed');
        return;
    }
    if (pathname === '/') {
        response.writeHead(302, {Location: START_PAGE}).end();
        return;
    }
    if (pathname === '/api/test-tone.wav') {
        response.writeHead(200, {
            'Content-Type': 'audio/wav',
            'Content-Length': chime.length,
            'Cache-Control': 'no-store'
        }).end(request.method === 'HEAD' ? undefined : chime);
        return;
    }
    const filePath = resolveFile(pathname);
    try {
        const info = filePath && await stat(filePath);
        if (!info || !info.isFile()) throw new Error('not a file');
        response.writeHead(200, {
            'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': info.size,
            // Lessons and test pages change often during development; the editor build is hashed.
            'Cache-Control': 'no-cache'
        });
        if (request.method === 'HEAD') {
            response.end();
        } else {
            createReadStream(filePath).pipe(response);
        }
    } catch {
        response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'}).end('No encontrado');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Tutor server on port ${PORT}`);
    console.log(`  This PC:   http://localhost:${PORT}/`);
    for (const addresses of Object.values(os.networkInterfaces())) {
        for (const address of addresses) {
            if (address.family === 'IPv4' && !address.internal) {
                console.log(`  On Wi-Fi:  http://${address.address}:${PORT}/`);
            }
        }
    }
    console.log(`  Audio test: /pruebas/audio.html`);
});
