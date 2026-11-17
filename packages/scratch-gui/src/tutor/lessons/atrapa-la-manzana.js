import {hasScript} from '../checks';

// Block names are written exactly as the es-419 editor shows them.
const lesson = {
    id: 'atrapa-la-manzana',
    title: 'Atrapa la manzana',
    intro: '¡Hola! Soy Hermione. Vamos a hacer un juego.',
    finished: '¡Lo lograste! Toca la bandera verde y mueve tu dedo por el escenario.',
    steps: [
        {
            id: 'bandera',
            prompt: 'Busca el bloque amarillo con la bandera verde. Arrástralo al centro.',
            check: hasScript(null, ['event_whenflagclicked']),
            hintTarget: {palette: 'event_whenflagclicked'},
            cannedHints: [
                '¿De qué color es la bandera?',
                'Toca el círculo amarillo que dice Eventos.',
                'Mira el bloque que brilla. Arrástralo al centro.'
            ],
            why: 'La bandera verde es el botón de empezar del juego.'
        },
        {
            id: 'por-siempre',
            prompt: 'Ahora pega el bloque "por siempre" debajo de la bandera.',
            check: hasScript(null, ['event_whenflagclicked', 'control_forever']),
            hintTarget: {palette: 'control_forever'},
            cannedHints: [
                '¿Qué bloque repite las cosas muchas veces?',
                'Es un bloque naranja con forma de boca. Está en Control.',
                'Mira el bloque que brilla. Pégalo debajo de la bandera.'
            ],
            why: 'El juego tiene que seguir funcionando todo el tiempo, no una sola vez.'
        },
        {
            id: 'seguir-el-dedo',
            prompt: 'Mete el bloque "ir a" dentro de "por siempre". Elige "puntero del ratón".',
            check: hasScript(null, [
                'event_whenflagclicked',
                {op: 'control_forever', body: [{op: 'motion_goto', menu: {TO: '_mouse_'}}]}
            ]),
            hintTarget: {palette: 'motion_goto'},
            cannedHints: [
                '¿Qué quieres que haga tu personaje?',
                'El bloque azul "ir a" va dentro de la boca naranja.',
                'Mira el bloque que brilla. Mételo dentro de "por siempre" y elige "puntero del ratón".'
            ],
            why: 'Así tu personaje sigue tu dedo para atrapar la manzana.'
        }
    ]
};

export default lesson;
