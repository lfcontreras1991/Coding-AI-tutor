// Speaks tutor text with the device's own Spanish voice.

const pickVoice = () => {
    const spanish = speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('es'));
    // Latin American voices first; any Spanish voice is better than none.
    return spanish.find(voice => /es[-_](mx|419|us)/i.test(voice.lang)) || spanish[0] || null;
};

/**
 * Stops whatever is being said and says the text. The first call must come from a tap;
 * after that, the browser also allows calls that are not started by a tap.
 * @param {string} text - what to say
 */
const speak = text => {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice ? voice.lang : 'es-MX';
    speechSynthesis.speak(utterance);
};

const stopSpeaking = () => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
};

export {speak, stopSpeaking};
