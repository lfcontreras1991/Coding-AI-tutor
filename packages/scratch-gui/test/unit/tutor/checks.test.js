import {hasScript} from '../../../src/tutor/checks';
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
