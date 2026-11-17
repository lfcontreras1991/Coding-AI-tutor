/**
 * Step checks. A check is a function from a project snapshot (see project-snapshot.js)
 * to {done, missing}. Only checks decide whether a step is complete.
 *
 * A pattern is a list of blocks expected in a script, in order. Each item is an opcode
 * or {op, body, menu}: `body` is a pattern for the blocks inside a C-shaped block and
 * `menu` maps an input name to the option its dropdown must show. Extra blocks between
 * the expected ones are allowed, so exploring does not break a step.
 */

const normalize = item => (typeof item === 'string' ? {op: item} : item);

// Returns null when the node satisfies the item, or the opcode that is still missing.
const missingInNode = (node, item) => {
    for (const [inputName, value] of Object.entries(item.menu || {})) {
        const input = node.inputs[inputName];
        if (!input || !Object.values(input.fields).includes(value)) return item.op;
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

export {hasScript};
