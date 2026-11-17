import {blockName, describeSnapshot} from '../../../src/tutor/block-names';

const node = (op, extra = {}) => ({op, fields: {}, inputs: {}, body: [], body2: [], ...extra});

describe('blockName', () => {
    test('uses the editor name for known blocks', () => {
        expect(blockName('control_forever')).toBe('por siempre');
    });

    test('falls back to the category for other blocks', () => {
        expect(blockName('looks_setsizeto')).toBe('otro bloque de Apariencia');
        expect(blockName('pen_clear')).toBe('otro bloque de otra categoría');
    });
});

describe('describeSnapshot', () => {
    test('says so when nothing has been built', () => {
        const snapshot = {sprites: [{name: 'Stage', isStage: true, scripts: []}, {name: 'Gato', isStage: false, scripts: []}]};
        expect(describeSnapshot(snapshot)).toBe('Todavía no hay ningún bloque en el área de programas.');
    });

    test('indents nested blocks and names dropdown options', () => {
        const snapshot = {
            sprites: [{
                name: 'Gato',
                isStage: false,
                scripts: [[
                    node('event_whenflagclicked'),
                    node('control_forever', {
                        body: [node('motion_goto', {
                            inputs: {TO: node('motion_goto_menu', {fields: {TO: '_mouse_'}})}
                        })]
                    })
                ]]
            }]
        };
        expect(describeSnapshot(snapshot)).toBe([
            'Objeto "Gato":',
            'Programa 1:',
            '  - al presionar bandera verde',
            '  - por siempre',
            '    - ir a (puntero del ratón)'
        ].join('\n'));
    });
});
