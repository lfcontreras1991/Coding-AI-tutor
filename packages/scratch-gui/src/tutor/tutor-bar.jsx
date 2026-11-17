import classNames from 'classnames';
import debounce from 'lodash.debounce';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {fetchHint} from './hint-client';
import {clearGlow, glowPaletteBlock} from './hint-glow';
import {getActiveLesson} from './lessons';
import {takeSnapshot} from './project-snapshot';
import {speak, stopSpeaking} from './speech';
import styles from './tutor-bar.css';

// The tutor speaks Latin American Spanish only, so its texts are not run through react-intl.
const TEXT = {
    start: 'Empezar',
    done: 'Listo',
    hint: 'Dame una pista',
    why: '¿Por qué?',
    repeat: 'Escuchar otra vez',
    notYet: 'Todavía no. ¿Quieres una pista?',
    thinking: 'Hermione está pensando...',
    praise: ['¡Muy bien!', '¡Eso es!', '¡Genial!']
};

// Long enough for a drag to settle before the project is checked.
const CHECK_DELAY_MS = 400;

const firstOpenStep = (lesson, vm, from) => {
    const snapshot = takeSnapshot(vm);
    let index = from;
    while (index < lesson.steps.length && lesson.steps[index].check(snapshot).done) index++;
    return index;
};

const TutorBar = ({lesson, vm}) => {
    const [started, setStarted] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [message, setMessage] = useState({text: lesson.title, kind: 'prompt'});
    // Read by the VM listener, which outlives individual renders.
    const stepRef = useRef(0);
    const hintLevelRef = useRef(0);

    // Counts everything the tutor says, so an answer that arrives late can tell it is stale.
    const requestRef = useRef(0);
    const previousHintsRef = useRef([]);

    const say = useCallback((text, kind) => {
        requestRef.current++;
        setMessage({text, kind});
        speak(text);
    }, []);

    // Moves to the first step whose check does not pass yet and says what comes next.
    const goToOpenStep = useCallback((from, opening) => {
        const next = firstOpenStep(lesson, vm, from);
        stepRef.current = next;
        hintLevelRef.current = 0;
        previousHintsRef.current = [];
        setStepIndex(next);
        clearGlow();
        const nextText = next < lesson.steps.length ? lesson.steps[next].prompt : lesson.finished;
        say(`${opening} ${nextText}`, next > from ? 'praise' : 'prompt');
    }, [lesson, vm, say]);

    useEffect(() => {
        if (!started) return;
        const onProjectChanged = debounce(() => {
            const index = stepRef.current;
            if (index >= lesson.steps.length) return;
            if (lesson.steps[index].check(takeSnapshot(vm)).done) {
                goToOpenStep(index, TEXT.praise[index % TEXT.praise.length]);
            }
        }, CHECK_DELAY_MS);
        vm.on('PROJECT_CHANGED', onProjectChanged);
        return () => {
            onProjectChanged.cancel();
            vm.removeListener('PROJECT_CHANGED', onProjectChanged);
        };
    }, [started, lesson, vm, goToOpenStep]);

    useEffect(() => () => {
        clearGlow();
        stopSpeaking();
    }, []);

    const handleStart = useCallback(() => {
        setStarted(true);
        goToOpenStep(0, lesson.intro);
    }, [lesson, goToOpenStep]);

    const finished = stepIndex >= lesson.steps.length;
    const step = finished ? null : lesson.steps[stepIndex];

    const handleDone = useCallback(() => {
        if (step.check(takeSnapshot(vm)).done) {
            goToOpenStep(stepIndex, TEXT.praise[stepIndex % TEXT.praise.length]);
        } else {
            say(TEXT.notYet, 'hint');
        }
    }, [step, stepIndex, vm, goToOpenStep, say]);

    // Gets the wording from the server, which falls back to the lesson's fixed text.
    // Returns false when the learner moved on or asked for something else while waiting.
    const askTutor = useCallback(async (button, level, fallback) => {
        const snapshot = takeSnapshot(vm);
        const requestId = ++requestRef.current;
        setMessage({text: TEXT.thinking, kind: 'hint'});
        const text = await fetchHint({
            lessonId: lesson.id,
            stepId: step.id,
            button,
            hintLevel: level,
            snapshot: {sprites: snapshot.sprites.filter(sprite => !sprite.isStage)},
            missing: step.check(snapshot).missing,
            previousHints: previousHintsRef.current
        }, fallback);
        if (requestId !== requestRef.current) return false;
        if (button === 'pista') previousHintsRef.current = [...previousHintsRef.current, text];
        say(text, 'hint');
        return true;
    }, [lesson, step, vm, say]);

    const handleHint = useCallback(async () => {
        const index = Math.min(hintLevelRef.current, step.cannedHints.length - 1);
        hintLevelRef.current = index + 1;
        const spoken = await askTutor('pista', index + 1, step.cannedHints[index]);
        // The last hint points at the block itself.
        if (spoken && index === step.cannedHints.length - 1 && step.hintTarget && step.hintTarget.palette) {
            glowPaletteBlock(step.hintTarget.palette);
        }
    }, [step, askTutor]);

    const handleWhy = useCallback(() => askTutor('porque', 1, step.why), [step, askTutor]);
    const handleRepeat = useCallback(() => speak(message.text), [message]);

    if (!started) {
        return (
            <div className={styles.bar}>
                <div className={styles.message}>{lesson.title}</div>
                <button
                    className={classNames(styles.button, styles.start)}
                    onClick={handleStart}
                >
                    {TEXT.start}
                </button>
            </div>
        );
    }

    return (
        <div className={styles.bar}>
            <div className={styles.progress}>
                {`${Math.min(stepIndex + 1, lesson.steps.length)} / ${lesson.steps.length}`}
            </div>
            <button
                aria-label={TEXT.repeat}
                className={classNames(styles.button, styles.speaker)}
                onClick={handleRepeat}
            >
                {'🔊'}
            </button>
            <div
                className={classNames(styles.message, {
                    [styles.hint]: message.kind === 'hint',
                    [styles.praise]: message.kind === 'praise'
                })}
            >
                {message.text}
            </div>
            {finished ? null : (
                <React.Fragment>
                    <button
                        className={classNames(styles.button, styles.done)}
                        onClick={handleDone}
                    >
                        {TEXT.done}
                    </button>
                    <button
                        className={styles.button}
                        onClick={handleHint}
                    >
                        {TEXT.hint}
                    </button>
                    <button
                        className={styles.button}
                        onClick={handleWhy}
                    >
                        {TEXT.why}
                    </button>
                </React.Fragment>
            )}
        </div>
    );
};

TutorBar.propTypes = {
    lesson: PropTypes.shape({
        finished: PropTypes.string.isRequired,
        id: PropTypes.string.isRequired,
        intro: PropTypes.string.isRequired,
        steps: PropTypes.arrayOf(PropTypes.shape({
            cannedHints: PropTypes.arrayOf(PropTypes.string).isRequired,
            check: PropTypes.func.isRequired,
            hintTarget: PropTypes.shape({palette: PropTypes.string}),
            id: PropTypes.string.isRequired,
            prompt: PropTypes.string.isRequired,
            why: PropTypes.string.isRequired
        })).isRequired,
        title: PropTypes.string.isRequired
    }).isRequired,
    vm: PropTypes.shape({
        on: PropTypes.func.isRequired,
        removeListener: PropTypes.func.isRequired
    }).isRequired
};

// The lesson comes from the page address, which does not change while the editor is open.
const activeLesson = getActiveLesson();

/**
 * The tutor bar when the address has `?lesson=<id>`, nothing otherwise.
 * @param root0
 * @param root0.vm
 */
const ActiveTutorBar = ({vm}) => (activeLesson ? (
    <TutorBar
        lesson={activeLesson}
        vm={vm}
    />
) : null);

ActiveTutorBar.propTypes = {
    vm: TutorBar.propTypes.vm
};

// Class for the editor's page wrapper: leaves room for the bar while a lesson is active.
const editorClassName = activeLesson ? styles.editorBelowBar : null;

export {ActiveTutorBar, TutorBar, editorClassName};
