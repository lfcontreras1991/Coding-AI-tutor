/**
 * Plain-object view of the project, read from the VM. Checks run against this
 * instead of the live VM so they can be unit tested.
 *
 * A script is an array of nodes, top block first:
 *   {op, fields: {NAME: value}, inputs: {NAME: node | null}, body: [node], body2: [node]}
 * `body` and `body2` hold the blocks inside C-shaped blocks ("por siempre", "si ... si no").
 */

const buildNode = (blocks, id) => {
    const block = blocks[id];
    if (!block) return null;
    const node = {op: block.opcode, fields: {}, inputs: {}, body: [], body2: []};
    for (const field of Object.values(block.fields || {})) {
        node.fields[field.name] = field.value;
    }
    for (const input of Object.values(block.inputs || {})) {
        if (input.name === 'SUBSTACK') {
            node.body = buildStack(blocks, input.block);
        } else if (input.name === 'SUBSTACK2') {
            node.body2 = buildStack(blocks, input.block);
        } else {
            node.inputs[input.name] = buildNode(blocks, input.block);
        }
    }
    return node;
};

const buildStack = (blocks, firstId) => {
    const stack = [];
    const seen = new Set();
    let id = firstId;
    while (id && blocks[id] && !seen.has(id)) {
        seen.add(id);
        stack.push(buildNode(blocks, id));
        id = blocks[id].next;
    }
    return stack;
};

/**
 * @param {object} blocks - block id to block, as in `target.blocks._blocks`
 * @returns {Array<Array<object>>} one array of nodes per script
 */
const scriptsFromBlocks = blocks => Object.values(blocks)
    .filter(block => block.topLevel && !block.shadow)
    .map(block => buildStack(blocks, block.id));

/**
 * @param {object} vm - the scratch-vm instance
 * @returns {{sprites: Array<{name: string, isStage: boolean, x: number, y: number, scripts: Array}>,
 *   variables: object}} the snapshot; `variables` maps the names of the variables for all sprites
 *   to their values
 */
const takeSnapshot = vm => ({
    variables: Object.fromEntries(Object.values(vm.runtime.getTargetForStage().variables)
        .filter(variable => variable.type === '')
        .map(variable => [variable.name, variable.value])),
    sprites: vm.runtime.targets
        .filter(target => target.isOriginal)
        .map(target => ({
            name: target.getName(),
            isStage: target.isStage,
            x: target.x,
            y: target.y,
            scripts: scriptsFromBlocks(target.blocks._blocks)
        }))
});

export {scriptsFromBlocks, takeSnapshot};
