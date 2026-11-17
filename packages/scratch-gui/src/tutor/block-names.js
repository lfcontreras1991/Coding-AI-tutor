// Block names as the es-419 editor shows them, for describing scripts to the hint model
// and for telling it which words it may use. Not shown to the learner directly.
const blockNames = {
    control_forever: 'por siempre',
    control_if: 'si ... entonces',
    control_if_else: 'si ... entonces, si no',
    control_repeat: 'repetir',
    control_repeat_until: 'repetir hasta que',
    control_stop: 'detener',
    control_wait: 'esperar ... segundos',
    control_wait_until: 'esperar hasta que',
    data_changevariableby: 'sumar a ...',
    data_setvariableto: 'dar a ... el valor',
    event_whenflagclicked: 'al presionar bandera verde',
    event_whenkeypressed: 'al presionar tecla',
    event_whenthisspriteclicked: 'al hacer clic en este objeto',
    looks_hide: 'esconder',
    looks_nextcostume: 'siguiente disfraz',
    looks_say: 'decir',
    looks_sayforsecs: 'decir ... durante ... segundos',
    looks_show: 'mostrar',
    looks_switchcostumeto: 'cambiar disfraz a',
    motion_changexby: 'cambiar x en',
    motion_changeyby: 'cambiar y en',
    motion_glidesecstoxy: 'deslizar en ... segs a x: y:',
    motion_glideto: 'deslizar en ... segs a',
    motion_goto: 'ir a',
    motion_gotoxy: 'ir a x: y:',
    motion_ifonedgebounce: 'si toca un borde, rebotar',
    motion_movesteps: 'mover ... pasos',
    motion_pointindirection: 'apuntar en dirección',
    motion_pointtowards: 'apuntar hacia',
    motion_setx: 'fijar x a',
    motion_sety: 'fijar y a',
    motion_turnleft: 'girar a la izquierda',
    motion_turnright: 'girar a la derecha',
    sensing_touchingobject: '¿tocando ...?',
    sound_play: 'iniciar sonido',
    sound_playuntildone: 'tocar sonido ... hasta que termine'
};

const menuOptionNames = {
    _mouse_: 'puntero del ratón',
    _random_: 'posición aleatoria',
    _edge_: 'borde'
};

const categoryNames = {
    control: 'Control',
    data: 'Variables',
    event: 'Eventos',
    looks: 'Apariencia',
    motion: 'Movimiento',
    operator: 'Operadores',
    sensing: 'Sensores',
    sound: 'Sonido'
};

const blockName = opcode => blockNames[opcode] ||
    `otro bloque de ${categoryNames[opcode.split('_')[0]] || 'otra categoría'}`;

const describeNode = (node, depth) => {
    const indent = '  '.repeat(depth);
    const options = Object.values(node.inputs)
        .filter(Boolean)
        .flatMap(input => Object.values(input.fields))
        .filter(value => Object.hasOwn(menuOptionNames, value))
        .map(value => menuOptionNames[value]);
    const lines = [`${indent}- ${blockName(node.op)}${options.length ? ` (${options.join(', ')})` : ''}`];
    for (const inner of [node.body, node.body2]) {
        if (inner.length) lines.push(...inner.map(child => describeNode(child, depth + 1)));
    }
    return lines.join('\n');
};

/**
 * @param {object} snapshot - a project snapshot (see project-snapshot.js)
 * @returns {string} the sprites' scripts as indented Spanish text
 */
const describeSnapshot = snapshot => {
    const sprites = snapshot.sprites.filter(sprite => !sprite.isStage && sprite.scripts.length);
    if (!sprites.length) return 'Todavía no hay ningún bloque en el área de programas.';
    return sprites.map(sprite => {
        const scripts = sprite.scripts.map((script, index) =>
            `Programa ${index + 1}:\n${script.map(node => describeNode(node, 1)).join('\n')}`);
        return `Objeto "${sprite.name}":\n${scripts.join('\n')}`;
    }).join('\n\n');
};

export {blockName, describeSnapshot};
