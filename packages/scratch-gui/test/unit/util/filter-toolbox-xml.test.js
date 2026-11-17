import filterToolboxXML from '../../../src/lib/filter-toolbox-xml';

const toolbox = `
<xml>
<category name="Events" toolboxitemid="events">
    <block type="event_whenflagclicked"/>
    <block type="event_whenkeypressed">
    </block>
    <block type="event_whenthisspriteclicked"/>
</category>
<category name="Control" toolboxitemid="control">
    <block type="control_wait">
        <value name="DURATION">
            <shadow type="math_positive_number">
                <field name="NUM">1</field>
            </shadow>
        </value>
    </block>
    <block type="control_forever"/>
    <block id="forever" type="control_repeat_until"/>
    <block type="control_stop"/>
</category>
<category name="Looks" toolboxitemid="looks">
    <block type="looks_show"/>
</category>
</xml>`;

const blockTypes = xml => Array.from(xml.matchAll(/<block\b[^>]*\btype="([^"]*)"/g), match => match[1]);

describe('filterToolboxXML', () => {
    test('returns the toolbox unchanged without a config', () => {
        expect(filterToolboxXML(toolbox, null)).toBe(toolbox);
    });

    test('keeps only whitelisted categories', () => {
        const filtered = filterToolboxXML(toolbox, {categories: ['events']});
        expect(blockTypes(filtered)).toEqual([
            'event_whenflagclicked', 'event_whenkeypressed', 'event_whenthisspriteclicked'
        ]);
    });

    test('a kept self-closing block does not keep the blocks after it', () => {
        const filtered = filterToolboxXML(toolbox, {
            blocks: {
                events: ['event_whenflagclicked'],
                control: ['control_forever']
            }
        });
        expect(blockTypes(filtered)).toEqual(['event_whenflagclicked', 'control_forever', 'looks_show']);
    });

    test('keeps a block with children intact', () => {
        const filtered = filterToolboxXML(toolbox, {blocks: {control: ['control_wait']}});
        expect(blockTypes(filtered)).toContain('control_wait');
        expect(blockTypes(filtered)).not.toContain('control_forever');
        expect(filtered).toContain('<field name="NUM">1</field>');
    });
});
