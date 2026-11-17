import log from '../lib/log.js';

// A little longer than the server's own limit, so its fixed-hint answer normally arrives first.
const TIMEOUT_MS = 7000;

/**
 * Asks the home server for a hint worded for what the learner has built.
 * @param {object} request - {lessonId, stepId, button, hintLevel, snapshot, missing, previousHints}
 * @param {string} fallback - the lesson's fixed text, used when the server cannot answer in time
 * @returns {Promise<string>} the text to show and say; never rejects
 */
const fetchHint = async (request, fallback) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch('/api/hint', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(request),
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const {texto} = await response.json();
        if (typeof texto !== 'string' || !texto) throw new Error('empty hint');
        return texto;
    } catch (error) {
        log.warn(`fetchHint: using the fixed hint (${error.message})`);
        return fallback;
    } finally {
        clearTimeout(timer);
    }
};

export {fetchHint};
