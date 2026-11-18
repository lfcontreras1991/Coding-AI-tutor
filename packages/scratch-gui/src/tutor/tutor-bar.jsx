import classNames from 'classnames';
import debounce from 'lodash.debounce';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import log from '../lib/log.js';

import {fetchHint} from './hint-client';
import {clearGlow, glowGreenFlag, glowPaletteBlock} from './hint-glow';
import {getActiveLesson} from './lessons';
import {takeSnapshot} from './project-snapshot';
import {clearSavedProject, loadSavedProject, saveProject} from './saved-project';
import {speakSequence, stopSpeaking} from './speech';
import styles from './tutor-bar.css';

// The tutor speaks Latin American Spanish only, so its texts are not run through react-intl.
const TEXT = {
    start: 'Empezar',
    resume: 'Continuar',
    startOver: 'Empezar de nuevo',
    confirmStartOver: '¿Borrar todo? Toca otra vez',
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
// An opening shorter than this is praise such as "¡Muy bien!", not a sentence of its own.
const SHORT_OPENING_CHARS = 20;
const SAVE_DELAY_MS = 1000;

// How often a step about the running game is checked while the learner plays.
const LIVE_CHECK_MS = 500;

// Steps about the running game cannot be checked again from the blocks after a reload,
// so the ones already passed are remembered in the browser.
const passedKey = lessonId => `tutor-passed-live-steps:${lessonId}`;

const readPassed = lessonId => {
    try {
        return new Set(JSON.parse(localStorage.getItem(passedKey(lessonId))) || []);
    } catch (error) {
        log.warn('TutorBar: could not read the passed steps', error);
        return new Set();
    }
};

const writePassed = (lessonId, passed) => {
    try {
        if (passed.size) {
            localStorage.setItem(passedKey(lessonId), JSON.stringify([...passed]));
        } else {
            localStorage.removeItem(passedKey(lessonId));
        }
    } catch (error) {
        log.warn('TutorBar: could not store the passed steps', error);
    }
};

const TutorBar = ({lesson, vm}) => {
    // 'loading' until the lesson's project is in the editor; then 'new', or 'saved' when it
    // is the learner's own project from an earlier visit.
    const [project, setProject] = useState('loading');
    const [confirmingStartOver, setConfirmingStartOver] = useState(false);
    const startingOverRef = useRef(false);
    const [started, setStarted] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [message, setMessage] = useState({text: lesson.title, kind: 'prompt'});
    // Read by the VM listener, which outlives individual renders.
    const stepRef = useRef(0);
    const hintLevelRef = useRef(0);

    // Counts everything the tutor says, so an answer that arrives late can tell it is stale.
    const requestRef = useRef(0);
    const previousHintsRef = useRef([]);

    const passedRef = useRef(null);
    if (!passedRef.current) passedRef.current = readPassed(lesson.id);
    // The game started by the last green flag in the current step, for checks about playing:
    // where every sprite was then, and (in the snapshot) how many ms ago that was.
    const runRef = useRef(null);
    const snap = useCallback(() => ({
        ...takeSnapshot(vm),
        run: runRef.current && {positions: runRef.current.positions, ms: Date.now() - runRef.current.at}
    }), [vm]);

    // What the tutor said last, as parts {text, kind}; the bar shows the part being spoken.
    const lastSaidRef = useRef([]);
    const sayParts = useCallback(parts => {
        lastSaidRef.current = parts;
        speakSequence(parts.map(part => part.text), index => setMessage(parts[index]));
    }, []);
    const say = useCallback((text, kind) => {
        requestRef.current++;
        sayParts([{text, kind}]);
    }, [sayParts]);

    // Moves to the first step whose check does not pass yet and says what comes next.
    const goToOpenStep = useCallback((from, opening) => {
        const snapshot = snap();
        let next = from;
        while (next < lesson.steps.length &&
            (passedRef.current.has(lesson.steps[next].id) || lesson.steps[next].check(snapshot).done)) next++;
        stepRef.current = next;
        hintLevelRef.current = 0;
        previousHintsRef.current = [];
        runRef.current = null;
        setStepIndex(next);
        clearGlow();
        // A step is told as: which part of the problem comes next (when a new part begins),
        // what is still missing for the goal, and only then what to do.
        const nextStep = lesson.steps[next];
        const texts = [
            ...opening,
            ...(nextStep ? [nextStep.partIntro, nextStep.purpose, nextStep.prompt] : [lesson.finished])
        ].filter(Boolean);
        // Short praise is said together with what follows it.
        if (texts[0].length < SHORT_OPENING_CHARS) texts.splice(0, 2, `${texts[0]} ${texts[1]}`);
        requestRef.current++;
        sayParts(texts.map((text, index) => ({
            text,
            kind: index === 0 && next > from ? 'praise' : 'prompt'
        })));
    }, [lesson, snap, sayParts]);

    const completeStep = useCallback(index => {
        const completed = lesson.steps[index];
        if (completed.live) {
            passedRef.current.add(completed.id);
            writePassed(lesson.id, passedRef.current);
        }
        goToOpenStep(index, [TEXT.praise[index % TEXT.praise.length]]);
    }, [lesson, goToOpenStep]);

    useEffect(() => {
        const onGreenFlag = () => {
            runRef.current = {
                at: Date.now(),
                positions: Object.fromEntries(
                    takeSnapshot(vm).sprites.map(sprite => [sprite.name, {x: sprite.x, y: sprite.y}]))
            };
        };
        vm.runtime.on('PROJECT_START', onGreenFlag);
        return () => vm.runtime.removeListener('PROJECT_START', onGreenFlag);
    }, [vm]);

    useEffect(() => {
        let cancelled = false;
        const loadLessonProject = async () => {
            const saved = await loadSavedProject(lesson.id);
            try {
                if (saved) {
                    await vm.loadProject(saved);
                } else if (lesson.starter) {
                    const response = await fetch(lesson.starter);
                    await vm.loadProject(await response.text());
                }
            } catch (error) {
                log.warn(`TutorBar: could not load the project for lesson "${lesson.id}"`, error);
            }
            if (!cancelled) setProject(saved ? 'saved' : 'new');
        };
        // The editor loads its own default project first; a project loaded before that would be replaced.
        if (vm.runtime.targets.length) {
            loadLessonProject();
        } else {
            vm.runtime.once('PROJECT_LOADED', loadLessonProject);
        }
        return () => {
            cancelled = true;
            vm.runtime.removeListener('PROJECT_LOADED', loadLessonProject);
        };
    }, [lesson, vm]);

    useEffect(() => {
        if (project === 'loading') return;
        const save = debounce(async () => {
            const sb3 = await vm.saveProjectSb3();
            if (!startingOverRef.current) saveProject(lesson.id, await sb3.arrayBuffer());
        }, SAVE_DELAY_MS);
        vm.on('PROJECT_CHANGED', save);
        return () => {
            save.cancel();
            vm.removeListener('PROJECT_CHANGED', save);
        };
    }, [project, lesson, vm]);

    useEffect(() => {
        if (!started) return;
        const checkNow = () => {
            const index = stepRef.current;
            if (index < lesson.steps.length && lesson.steps[index].check(snap()).done) completeStep(index);
        };
        const onProjectChanged = debounce(checkNow, CHECK_DELAY_MS);
        vm.on('PROJECT_CHANGED', onProjectChanged);
        // Playing does not change the project, so a step about the running game is polled.
        const live = stepIndex < lesson.steps.length && lesson.steps[stepIndex].live;
        const timer = live ? setInterval(checkNow, LIVE_CHECK_MS) : null;
        return () => {
            onProjectChanged.cancel();
            vm.removeListener('PROJECT_CHANGED', onProjectChanged);
            clearInterval(timer);
        };
    }, [started, stepIndex, lesson, vm, snap, completeStep]);

    useEffect(() => () => {
        clearGlow();
        stopSpeaking();
    }, []);

    const handleStart = useCallback(() => {
        setStarted(true);
        goToOpenStep(0, project === 'saved' ? [lesson.resume] : lesson.intro);
    }, [lesson, project, goToOpenStep]);

    // Asks for a second tap, then reloads the page so the lesson starts from its first project.
    const handleStartOver = useCallback(async () => {
        if (!confirmingStartOver) {
            setConfirmingStartOver(true);
            return;
        }
        startingOverRef.current = true;
        await clearSavedProject(lesson.id);
        writePassed(lesson.id, new Set());
        // The editor's "leave this page?" question is about work this tap just discarded.
        window.onbeforeunload = null;
        location.reload();
    }, [lesson, confirmingStartOver]);

    const finished = stepIndex >= lesson.steps.length;
    const step = finished ? null : lesson.steps[stepIndex];

    // The reminder to say when the step is about one sprite and the learner has another one open.
    const otherSpriteReminder = useCallback(() => (
        step.sprite && vm.editingTarget && vm.editingTarget.getName() !== step.sprite ?
            lesson.selectSprite[step.sprite] : null
    ), [lesson, step, vm]);

    const handleDone = useCallback(() => {
        if (step.check(snap()).done) {
            completeStep(stepIndex);
        } else {
            say(otherSpriteReminder() || TEXT.notYet, 'hint');
        }
    }, [step, stepIndex, snap, completeStep, otherSpriteReminder, say]);

    // Gets the wording from the server, which falls back to the lesson's fixed text.
    // Returns false when the learner moved on or asked for something else while waiting.
    const askTutor = useCallback(async (button, level, fallback) => {
        const snapshot = snap();
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
    }, [lesson, step, snap, say]);

    const handleHint = useCallback(async () => {
        const reminder = otherSpriteReminder();
        if (reminder) {
            say(reminder, 'hint');
            return;
        }
        const index = Math.min(hintLevelRef.current, step.cannedHints.length - 1);
        hintLevelRef.current = index + 1;
        const spoken = await askTutor('pista', index + 1, step.cannedHints[index]);
        // The last hint points at the thing to touch.
        if (spoken && index === step.cannedHints.length - 1) {
            if (step.hintTarget.palette) glowPaletteBlock(step.hintTarget.palette);
            if (step.hintTarget.greenFlag) glowGreenFlag();
        }
    }, [step, askTutor, otherSpriteReminder, say]);

    const handleWhy = useCallback(() => askTutor('porque', 1, step.why), [step, askTutor]);
    const handleRepeat = useCallback(() => sayParts(lastSaidRef.current), [sayParts]);

    if (!started) {
        return (
            <div className={styles.bar}>
                <div className={styles.message}>{lesson.title}</div>
                {project === 'loading' ? null : (
                    <button
                        className={classNames(styles.button, styles.start)}
                        onClick={handleStart}
                    >
                        {project === 'saved' ? TEXT.resume : TEXT.start}
                    </button>
                )}
                {project === 'saved' ? (
                    <button
                        className={styles.button}
                        onClick={handleStartOver}
                    >
                        {confirmingStartOver ? TEXT.confirmStartOver : TEXT.startOver}
                    </button>
                ) : null}
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
        intro: PropTypes.arrayOf(PropTypes.string).isRequired,
        resume: PropTypes.string.isRequired,
        selectSprite: PropTypes.objectOf(PropTypes.string).isRequired,
        starter: PropTypes.string,
        steps: PropTypes.arrayOf(PropTypes.shape({
            cannedHints: PropTypes.arrayOf(PropTypes.string).isRequired,
            check: PropTypes.func.isRequired,
            hintTarget: PropTypes.shape({
                greenFlag: PropTypes.bool,
                palette: PropTypes.string
            }).isRequired,
            id: PropTypes.string.isRequired,
            live: PropTypes.bool,
            partIntro: PropTypes.string,
            prompt: PropTypes.string.isRequired,
            purpose: PropTypes.string.isRequired,
            sprite: PropTypes.string,
            why: PropTypes.string.isRequired
        })).isRequired,
        title: PropTypes.string.isRequired
    }).isRequired,
    vm: PropTypes.shape({
        editingTarget: PropTypes.shape({getName: PropTypes.func.isRequired}),
        loadProject: PropTypes.func.isRequired,
        on: PropTypes.func.isRequired,
        removeListener: PropTypes.func.isRequired,
        runtime: PropTypes.shape({
            on: PropTypes.func.isRequired,
            once: PropTypes.func.isRequired,
            removeListener: PropTypes.func.isRequired,
            targets: PropTypes.arrayOf(PropTypes.object).isRequired
        }).isRequired,
        saveProjectSb3: PropTypes.func.isRequired
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
