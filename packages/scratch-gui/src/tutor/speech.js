// Speaks tutor text with the device's own Spanish voice.

const pickVoice = () => {
    const spanish = speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('es'));
    // Latin American voices first; any Spanish voice is better than none.
    return spanish.find(voice => /es[-_](mx|419|us)/i.test(voice.lang)) || spanish[0] || null;
};

// Pace for showing the next part when the browser does not report that it started saying it.
// Slower than the voice, so it only takes over when that report is missing.
const FALLBACK_MS_PER_CHAR = 110;
const FALLBACK_PAUSE_MS = 1500;

let currentSequence = 0;
let fallbackTimer = null;
// Safari can drop the events of an utterance nothing refers to any more.
let utterances = [];

/**
 * Stops whatever is being said and says the texts one after another. `onPart(index)` is called
 * when each text starts, so the screen can show the part that is being said. The first call
 * must come from a tap; after that, the browser also allows calls that are not started by a tap.
 * @param {Array<string>} texts - what to say, in order
 * @param {function(number)} onPart - called with the index of the text that starts
 */
const speakSequence = (texts, onPart) => {
    const sequence = ++currentSequence;
    clearTimeout(fallbackTimer);
    let shown = -1;
    const show = index => {
        if (sequence !== currentSequence || index <= shown || index >= texts.length) return;
        shown = index;
        onPart(index);
        clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(
            () => show(index + 1),
            FALLBACK_PAUSE_MS + (texts[index].length * FALLBACK_MS_PER_CHAR)
        );
    };
    show(0);
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const voice = pickVoice();
    utterances = texts.map((text, index) => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) utterance.voice = voice;
        utterance.lang = voice ? voice.lang : 'es-MX';
        utterance.onstart = () => show(index);
        speechSynthesis.speak(utterance);
        return utterance;
    });
};

const stopSpeaking = () => {
    currentSequence++;
    clearTimeout(fallbackTimer);
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
};

export {speakSequence, stopSpeaking};
