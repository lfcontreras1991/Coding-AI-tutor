import {hasScript, movedSinceFlag, scoredSinceFlag} from '../../../src/tutor/checks';
import {scriptsFromBlocks} from '../../../src/tutor/project-snapshot';

// Builds a VM-style block map from a compact description.
let nextId = 0;
const addStack = (blocks, items, parent = null) => {
    let firstId = null;
    let previous = null;
    for (const item of items) {
        const id = `b${nextId++}`;
        const block = {
            id,
            opcode: item.op,
            fields: {},
            inputs: {},
            next: null,
            parent: previous ? previous.id : parent,
            topLevel: !previous && !parent,
            shadow: false
        };
        blocks[id] = block;
        if (item.menu) {
            for (const [inputName, value] of Object.entries(item.menu)) {
                const menuId = `b${nextId++}`;
                blocks[menuId] = {
                    id: menuId,
                    opcode: `${item.op}_menu`,
                    fields: {[inputName]: {name: inputName, value}},
                    inputs: {},
                    next: null,
                    parent: id,
                    topLevel: false,
                    shadow: true
                };
                block.inputs[inputName] = {name: inputName, block: menuId, shadow: menuId};
            }
        }
        if (item.body) {
            block.inputs.SUBSTACK = {name: 'SUBSTACK', block: addStack(blocks, item.body, id), shadow: null};
        }
        if (previous) previous.next = id;
        if (!firstId) firstId = id;
        previous = block;
    }
    return firstId;
};

const snapshotOf = (...sprites) => ({
    sprites: [
        {name: 'Stage', isStage: true, scripts: []},
        ...sprites.map(({name, scripts}) => {
            const blocks = {};
            scripts.forEach(script => addStack(blocks, script));
            return {name, isStage: false, scripts: scriptsFromBlocks(blocks)};
        })
    ]
});

const followFinger = [
    'event_whenflagclicked',
    {op: 'control_forever', body: [{op: 'motion_goto', menu: {TO: '_mouse_'}}]}
];

describe('scriptsFromBlocks', () => {
    test('builds nested scripts and skips shadow blocks at the top level', () => {
        const blocks = {};
        addStack(blocks, [
            {op: 'event_whenflagclicked'},
            {op: 'control_forever', body: [{op: 'motion_goto', menu: {TO: '_random_'}}]}
        ]);
        const scripts = scriptsFromBlocks(blocks);
        expect(scripts).toHaveLength(1);
        expect(scripts[0].map(node => node.op)).toEqual(['event_whenflagclicked', 'control_forever']);
        expect(scripts[0][1].body[0].op).toBe('motion_goto');
        expect(scripts[0][1].body[0].inputs.TO.fields.TO).toBe('_random_');
    });

    test('a C-shaped block with nothing inside has an empty body', () => {
        const blocks = {};
        addStack(blocks, [{op: 'control_forever'}]);
        expect(scriptsFromBlocks(blocks)[0][0].body).toEqual([]);
    });
});

describe('hasScript', () => {
    test('passes on the right answer', () => {
        const snapshot = snapshotOf({name: 'Cesta',
            scripts: [[
                {op: 'event_whenflagclicked'},
                {op: 'control_forever', body: [{op: 'motion_goto', menu: {TO: '_mouse_'}}]}
            ]]});
        expect(hasScript('Cesta', followFinger)(snapshot)).toEqual({done: true, missing: []});
        expect(hasScript(null, followFinger)(snapshot).done).toBe(true);
    });

    test('an empty project is missing the first block', () => {
        expect(hasScript(null, followFinger)(snapshotOf({name: 'Cesta', scripts: []})))
            .toEqual({done: false, missing: ['event_whenflagclicked']});
    });

    test('fails when the block is outside the loop', () => {
        const snapshot = snapshotOf({name: 'Cesta',
            scripts: [[
                {op: 'event_whenflagclicked'},
                {op: 'motion_goto', menu: {TO: '_mouse_'}},
                {op: 'control_forever'}
            ]]});
        expect(hasScript('Cesta', followFinger)(snapshot)).toEqual({done: false, missing: ['motion_goto']});
    });

    test('fails when the blocks are in the wrong order', () => {
        const snapshot = snapshotOf({name: 'Cesta',
            scripts: [[
                {op: 'control_forever'},
                {op: 'event_whenflagclicked'}
            ]]});
        const check = hasScript('Cesta', ['event_whenflagclicked', 'control_forever']);
        expect(check(snapshot)).toEqual({done: false, missing: ['control_forever']});
    });

    test('fails when the dropdown shows another option', () => {
        const snapshot = snapshotOf({name: 'Cesta',
            scripts: [[
                {op: 'event_whenflagclicked'},
                {op: 'control_forever', body: [{op: 'motion_goto', menu: {TO: '_random_'}}]}
            ]]});
        expect(hasScript('Cesta', followFinger)(snapshot)).toEqual({done: false, missing: ['motion_goto']});
    });

    test('fails when the script is on another sprite', () => {
        const snapshot = snapshotOf(
            {name: 'Cesta', scripts: []},
            {name: 'Manzana', scripts: [[{op: 'event_whenflagclicked'}]]}
        );
        expect(hasScript('Cesta', ['event_whenflagclicked'])(snapshot).done).toBe(false);
        expect(hasScript(null, ['event_whenflagclicked'])(snapshot).done).toBe(true);
    });

    test('allows extra blocks between the expected ones', () => {
        const snapshot = snapshotOf({name: 'Cesta',
            scripts: [[
                {op: 'event_whenflagclicked'},
                {op: 'looks_show'},
                {op: 'control_forever',
                    body: [
                        {op: 'looks_nextcostume'},
                        {op: 'motion_goto', menu: {TO: '_mouse_'}}
                    ]}
            ]]});
        expect(hasScript('Cesta', followFinger)(snapshot).done).toBe(true);
    });

    test('loose blocks without the starting block do not count', () => {
        const snapshot = snapshotOf({name: 'Cesta', scripts: [[{op: 'control_forever'}]]});
        const check = hasScript('Cesta', ['event_whenflagclicked', 'control_forever']);
        expect(check(snapshot)).toEqual({done: false, missing: ['event_whenflagclicked']});
    });
});

// Snapshot nodes written directly, for blocks with numbers, variables and blocks in holes.
const node = (op, extra = {}) => ({op, fields: {}, inputs: {}, body: [], body2: [], ...extra});
const number = value => node('math_number', {fields: {NUM: value}});
const foodWith = (...inside) => ({
    sprites: [{
        name: 'Comida',
        isStage: false,
        scripts: [[node('event_whenflagclicked'), node('control_forever', {body: inside})]]
    }]
});
const inLoop = item => hasScript('Comida', ['event_whenflagclicked', {op: 'control_forever', body: [item]}]);

describe('hasScript with numbers, fields and plugged blocks', () => {
    const falls = inLoop({op: 'motion_changeyby', num: {DY: {max: -1}}});

    test('passes when the typed number is in range', () => {
        expect(falls(foodWith(node('motion_changeyby', {inputs: {DY: number('-5')}}))).done).toBe(true);
    });

    test('fails on a number out of range and on an empty hole', () => {
        expect(falls(foodWith(node('motion_changeyby', {inputs: {DY: number('10')}}))))
            .toEqual({done: false, missing: ['motion_changeyby']});
        expect(falls(foodWith(node('motion_changeyby', {inputs: {DY: number('')}}))).done).toBe(false);
    });

    test('checks the variable a block is about', () => {
        const scores = inLoop({op: 'data_changevariableby', fields: {VARIABLE: 'Puntos'}});
        const change = name => node('data_changevariableby', {fields: {VARIABLE: name}});
        expect(scores(foodWith(change('Puntos'))).done).toBe(true);
        expect(scores(foodWith(change('mi variable'))).done).toBe(false);
    });

    test('checks the block plugged into a hole and its dropdown', () => {
        const asks = inLoop({
            op: 'control_if',
            inputs: {CONDITION: {op: 'sensing_touchingobject', menu: {TOUCHINGOBJECTMENU: 'Dinosaurio'}}}
        });
        const touching = name => node('sensing_touchingobject', {
            inputs: {TOUCHINGOBJECTMENU: node('sensing_touchingobjectmenu', {fields: {TOUCHINGOBJECTMENU: name}})}
        });
        expect(asks(foodWith(node('control_if', {inputs: {CONDITION: touching('Dinosaurio')}}))).done).toBe(true);
        expect(asks(foodWith(node('control_if', {inputs: {CONDITION: touching('_mouse_')}}))))
            .toEqual({done: false, missing: ['sensing_touchingobject']});
        expect(asks(foodWith(node('control_if', {inputs: {CONDITION: null}}))))
            .toEqual({done: false, missing: ['sensing_touchingobject']});
    });
});

describe('checks about the running game', () => {
    const at = (x, y, run) => ({sprites: [{name: 'Dinosaurio', isStage: false, x, y, scripts: []}], variables: {}, run});
    const run = {positions: {Dinosaurio: {x: 0, y: -100}}};

    test('movedSinceFlag needs a green flag and a real move', () => {
        const moved = movedSinceFlag('Dinosaurio');
        expect(moved(at(80, 20, null)).done).toBe(false);
        expect(moved(at(3, -100, run)).done).toBe(false);
        expect(moved(at(80, 20, run))).toEqual({done: true, missing: []});
    });

    test('scoredSinceFlag needs the score to be reached in a started game', () => {
        const fivePoints = scoredSinceFlag('Puntos', 5);
        const playing = {positions: {}, ms: 2000};
        expect(fivePoints({sprites: [], variables: {Puntos: 4}, run: playing}).done).toBe(false);
        expect(fivePoints({sprites: [], variables: {Puntos: 5}, run: playing}).done).toBe(true);
        expect(fivePoints({sprites: [], variables: {}, run: playing}).done).toBe(false);
    });

    test('scoredSinceFlag ignores a score left over from an earlier game', () => {
        const fivePoints = scoredSinceFlag('Puntos', 5);
        expect(fivePoints({sprites: [], variables: {Puntos: 7}, run: null}).done).toBe(false);
        expect(fivePoints({sprites: [], variables: {Puntos: 7}, run: {positions: {}, ms: 20}}).done).toBe(false);
    });
});
