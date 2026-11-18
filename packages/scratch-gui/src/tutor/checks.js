/**
 * Step checks. A check is a function from a project snapshot (see project-snapshot.js)
 * to {done, missing}. Only checks decide whether a step is complete.
 *
 * A pattern is a list of blocks expected in a script, in order. Each item is an opcode
 * or {op, body, menu, fields, num, inputs}:
 *   `body`   pattern for the blocks inside a C-shaped block
 *   `menu`   input name -> the option its dropdown must show
 *   `fields` field name -> the value the block's own dropdown must show (e.g. a variable name)
 *   `num`    input name -> {min, max} range for the number typed into it
 *   `inputs` input name -> item for the block plugged into that hole
 * Extra blocks between the expected ones are allowed, so exploring does not break a step.
 */

const normalize = item => (typeof item === 'string' ? {op: item} : item);

// Returns null when the node satisfies the item, or the opcode that is still missing.
const missingInNode = (node, item) => {
    for (const [inputName, value] of Object.entries(item.menu || {})) {
        const input = node.inputs[inputName];
        if (!input || !Object.values(input.fields).includes(value)) return item.op;
    }
    for (const [fieldName, value] of Object.entries(item.fields || {})) {
        if (node.fields[fieldName] !== value) return item.op;
    }
    for (const [inputName, {min = -Infinity, max = Infinity}] of Object.entries(item.num || {})) {
        const input = node.inputs[inputName];
        const typed = input ? Object.values(input.fields)[0] : '';
        // An empty hole reads as 0 when the project runs, but the learner has not chosen it.
        if (typed === '' || !(Number(typed) >= min && Number(typed) <= max)) return item.op;
    }
    for (const [inputName, inner] of Object.entries(item.inputs || {})) {
        const expected = normalize(inner);
        const input = node.inputs[inputName];
        if (!input || input.op !== expected.op) return expected.op;
        const missing = missingInNode(input, expected);
        if (missing !== null) return missing;
    }
    if (item.body) return matchStack(node.body, item.body).missing;
    return null;
};

const matchStack = (stack, pattern) => {
    let from = 0;
    for (let matched = 0; matched < pattern.length; matched++) {
        const item = normalize(pattern[matched]);
        let missing = item.op;
        let foundAt = -1;
        for (let index = from; index < stack.length; index++) {
            if (stack[index].op !== item.op) continue;
            missing = missingInNode(stack[index], item);
            if (missing === null) {
                foundAt = index;
                break;
            }
        }
        if (foundAt === -1) return {matched, missing};
        from = foundAt + 1;
    }
    return {matched: pattern.length, missing: null};
};

/**
 * @param {?string} spriteName - sprite that must hold the script, or null for any sprite
 * @param {Array} pattern - blocks expected in one script, in order
 * @returns {function(object): {done: boolean, missing: Array<string>}} the check
 */
const hasScript = (spriteName, pattern) => snapshot => {
    const sprites = snapshot.sprites.filter(sprite =>
        (spriteName === null ? !sprite.isStage : sprite.name === spriteName));
    let best = {matched: -1, missing: normalize(pattern[0]).op};
    for (const sprite of sprites) {
        for (const script of sprite.scripts) {
            const result = matchStack(script, pattern);
            if (result.missing === null) return {done: true, missing: []};
            if (result.matched > best.matched) best = result;
        }
    }
    return {done: false, missing: [best.missing]};
};

// A sprite counts as moved when it is this far from where it was at the last green flag.
const MOVED_DISTANCE = 10;

/**
 * @param {string} spriteName - sprite that must have moved since the green flag was last pressed
 * @returns {function(object): {done: boolean, missing: Array<string>}} the check
 */
const movedSinceFlag = spriteName => snapshot => {
    const start = snapshot.run && snapshot.run.positions[spriteName];
    const sprite = snapshot.sprites.find(candidate => candidate.name === spriteName);
    const done = Boolean(start && sprite) &&
        Math.hypot(sprite.x - start.x, sprite.y - start.y) >= MOVED_DISTANCE;
    return {done, missing: []};
};

// Scripts need a moment after the green flag to reset a score left over from the game before.
const SETTLE_MS = 300;

/**
 * @param {string} variableName - a variable for all sprites
 * @param {number} value - the least value that passes
 * @returns {function(object): {done: boolean, missing: Array<string>}} a check that passes when
 *   the variable has reached the value in a game started with the green flag
 */
const scoredSinceFlag = (variableName, value) => snapshot => ({
    done: Boolean(snapshot.run) && snapshot.run.ms >= SETTLE_MS &&
        Number(snapshot.variables[variableName]) >= value,
    missing: []
});

export {hasScript, movedSinceFlag, scoredSinceFlag};
