// Tutor hints written by Claude. The model only words the hint: which step the learner is on,
// whether it is done and which block glows are all decided by code in the browser.
// Without an API key, or on any error, refusal or slow answer, the lesson's fixed hint is used,
// so a session never stalls on the network.
import Anthropic from '@anthropic-ai/sdk';

import {blockName, describeSnapshot} from '../packages/scratch-gui/src/tutor/block-names.js';
import atrapaLaManzana from '../packages/scratch-gui/src/tutor/lessons/atrapa-la-manzana.js';

const lessons = {[atrapaLaManzana.id]: atrapaLaManzana};

const MODEL = process.env.HINT_MODEL || 'claude-opus-5-5';
const TIMEOUT_MS = Number(process.env.HINT_TIMEOUT_MS) || 5000;
const MAX_HINT_CHARS = 220;
const MAX_LEVEL = 3;

const SYSTEM_PROMPT = `Eres Hermione, una tutora paciente y cariñosa que ayuda a un niño pequeño que está \
aprendiendo a programar con bloques en una tableta. Un adulto está sentado a su lado. Tu texto se lee en \
voz alta con una voz sintética, así que el niño lo escucha, no lo lee.

Escribes una sola ayuda corta cada vez. El niño toca un botón para pedirla; no puede escribirte ni hablarte, \
así que nunca le pidas que escriba, que te responda o que te diga algo.

Cómo hablas:
- Español latinoamericano, tuteando, con palabras que entiende un niño que empieza la primaria.
- Como máximo dos oraciones cortas, unas veinte palabras en total.
- Texto plano que suene natural al oído: sin emojis, sin listas, sin palabras en inglés y sin nombres \
técnicos de bloques. Usa los nombres de los bloques exactamente como aparecen en la lista que recibes.
- Habla solo de los bloques de este paso. Hay muchos más bloques en pantalla; no menciones otros.

Qué tipo de ayuda das depende del nivel que te piden, porque el niño aprende más si descubre la respuesta:
- Nivel 1: una sola pregunta que lo haga mirar lo correcto. No nombres el bloque que falta.
- Nivel 2: una pista sobre el color o la forma del bloque que falta y la categoría donde está. No digas \
dónde colocarlo.
- Nivel 3: el bloque que falta va a brillar en la pantalla. Dile que mire el bloque que brilla y cuál es la \
única acción siguiente.
- "¿Por qué?": explica para qué sirve este paso en su juego, usando la idea que recibes.

El programa decide por su cuenta cuándo el paso está terminado, así que no digas que algo ya está bien, \
terminado o correcto, y no des la solución completa del paso. Si ya recibió pistas antes, dilo de otra manera \
en lugar de repetirlas. Fíjate en lo que el niño ya construyó: si puso el bloque correcto en un lugar \
equivocado, ayúdalo con eso.`;

const OUTPUT_FORMAT = {
    type: 'json_schema',
    schema: {
        type: 'object',
        properties: {
            texto: {type: 'string', description: 'La ayuda, lista para leerse en voz alta.'}
        },
        required: ['texto'],
        additionalProperties: false
    }
};

class HintError extends Error {
    constructor (status, message) {
        super(message);
        this.status = status;
    }
}

const hasCredentials = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
// Retries would outlast the time a small child will wait; the fixed hint is the retry.
const client = hasCredentials ? new Anthropic({maxRetries: 0, timeout: TIMEOUT_MS}) : null;

const buildUserMessage = ({step, button, level, snapshot, missing, previousHints}) => {
    return [
        `Paso actual. El niño escuchó esta instrucción: "${step.prompt}"`,
        `Idea del paso: ${step.why}`,
        `Bloques de este paso: ${step.blocks.map(opcode => `"${blockName(opcode)}"`).join(', ')}.`,
        `Lo que el niño tiene construido ahora:\n${describeSnapshot(snapshot)}`,
        missing.length ?
            `Según el programa, todavía falta colocar bien: ${missing.map(opcode => `"${blockName(opcode)}"`).join(', ')}.` :
            'Según el programa, no falta ningún bloque.',
        previousHints.length ?
            `Pistas que ya escuchó en este paso:\n${previousHints.map(hint => `- ${hint}`).join('\n')}` :
            'Todavía no ha escuchado ninguna pista en este paso.',
        button === 'porque' ?
            'El niño tocó "¿Por qué?". Escribe la explicación.' :
            `El niño tocó "Dame una pista". Escribe una pista de nivel ${level}.`
    ].join('\n\n');
};

const validateRequest = body => {
    const lesson = typeof body.lessonId === 'string' && Object.hasOwn(lessons, body.lessonId) ?
        lessons[body.lessonId] : null;
    if (!lesson) throw new HintError(400, 'Unknown "lessonId"');
    const step = lesson.steps.find(candidate => candidate.id === body.stepId);
    if (!step) throw new HintError(400, 'Unknown "stepId"');
    if (body.button !== 'pista' && body.button !== 'porque') {
        throw new HintError(400, '"button" must be "pista" or "porque"');
    }
    const level = Math.min(MAX_LEVEL, Math.max(1, Math.trunc(Number(body.hintLevel)) || 1));
    if (!body.snapshot || !Array.isArray(body.snapshot.sprites)) {
        throw new HintError(400, '"snapshot.sprites" must be an array');
    }
    const strings = value => (Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 6) : []);
    return {
        step,
        button: body.button,
        level,
        snapshot: body.snapshot,
        missing: strings(body.missing),
        previousHints: strings(body.previousHints).map(hint => hint.slice(0, MAX_HINT_CHARS))
    };
};

const fixedHint = ({step, button, level}) =>
    (button === 'porque' ? step.why : step.cannedHints[Math.min(level, step.cannedHints.length) - 1]);

const askClaude = async request => {
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        output_config: {effort: 'low', format: OUTPUT_FORMAT},
        messages: [{role: 'user', content: buildUserMessage(request)}]
    });
    if (response.stop_reason !== 'end_turn') {
        throw new Error(`hint stopped with "${response.stop_reason}"`);
    }
    const textBlock = response.content.find(block => block.type === 'text');
    const texto = textBlock ? JSON.parse(textBlock.text).texto.trim() : '';
    if (!texto || texto.length > MAX_HINT_CHARS) {
        throw new Error(`hint has an unusable length (${texto.length} characters)`);
    }
    return texto;
};

/**
 * @param {object} body - {lessonId, stepId, button, hintLevel, snapshot, missing, previousHints}
 * @returns {Promise<{texto: string, source: string, ms: number}>} the hint and where it came from
 */
const getHint = async body => {
    const request = validateRequest(body);
    const started = Date.now();
    if (client) {
        try {
            const texto = await askClaude(request);
            return {texto, source: MODEL, ms: Date.now() - started};
        } catch (error) {
            if (error instanceof Anthropic.AuthenticationError) {
                console.error('Hint: the Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env');
            } else if (error instanceof Anthropic.RateLimitError) {
                console.error('Hint: rate limited by the Anthropic API');
            } else if (error instanceof Anthropic.APIConnectionError) {
                console.error(`Hint: no answer within ${TIMEOUT_MS} ms or no connection (${error.message})`);
            } else if (error instanceof Anthropic.APIError) {
                console.error(`Hint: API error ${error.status}: ${error.message}`);
            } else {
                console.error(`Hint: ${error.message}`);
            }
        }
    }
    return {texto: fixedHint(request), source: 'fixed', ms: Date.now() - started};
};

export {HintError, MODEL as hintModel, getHint, hasCredentials as hintsUseClaude};
