// The home server imports this file too, so the import carries its extension.
import {hasScript, movedSinceFlag, scoredSinceFlag} from '../checks.js';

// The food's script: the green flag, then a "por siempre" holding the given blocks.
const foodLoop = (...inside) => hasScript('Comida', [
    'event_whenflagclicked',
    {op: 'control_forever', body: inside}
]);

// Block names are written exactly as the es-419 editor shows them.
// Each step:
//   `sprite`  the sprite whose scripts the step is about; the tutor asks the learner to select it
//   `blocks`  the blocks the step is about; the hint model may only talk about those
//   `live`    the check is about the running game, so it is watched while the learner plays
//   `tip`     extra facts for the hint model, never shown to the learner
const lesson = {
    id: 'atrapa-la-comida',
    title: 'Atrapa la comida',
    // Sprites Dinosaurio and Comida and the variable Puntos, without scripts.
    starter: '/lessons/atrapa-la-comida/starter.json',
    intro: '¡Hola! Soy Hermione. Vamos a hacer un juego con tu dinosaurio.',
    resume: '¡Hola otra vez! Sigamos con tu juego.',
    finished: '¡Lo lograste! Hiciste tu propio juego. Sigue jugando o cámbialo como quieras.',
    selectSprite: {
        Dinosaurio: 'Primero toca tu dinosaurio, debajo del escenario.',
        Comida: 'Primero toca la comida, debajo del escenario.'
    },
    steps: [
        {
            id: 'bandera',
            sprite: 'Dinosaurio',
            prompt: 'Busca el bloque amarillo con la bandera verde. Arrástralo al centro.',
            blocks: ['event_whenflagclicked'],
            check: hasScript('Dinosaurio', ['event_whenflagclicked']),
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
            sprite: 'Dinosaurio',
            prompt: 'Ahora pega el bloque "por siempre" debajo de la bandera.',
            blocks: ['event_whenflagclicked', 'control_forever'],
            check: hasScript('Dinosaurio', ['event_whenflagclicked', 'control_forever']),
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
            sprite: 'Dinosaurio',
            prompt: 'Mete el bloque "ir a" dentro de "por siempre". Elige "puntero del ratón".',
            blocks: ['event_whenflagclicked', 'control_forever', 'motion_goto'],
            check: hasScript('Dinosaurio', [
                'event_whenflagclicked',
                {op: 'control_forever', body: [{op: 'motion_goto', menu: {TO: '_mouse_'}}]}
            ]),
            hintTarget: {palette: 'motion_goto'},
            cannedHints: [
                '¿Qué quieres que haga tu dinosaurio?',
                'El bloque azul "ir a" va dentro de la boca naranja.',
                'Mira el bloque que brilla. Mételo dentro de "por siempre" y elige "puntero del ratón".'
            ],
            why: 'Así tu dinosaurio sigue tu dedo para atrapar la comida.'
        },
        {
            id: 'probar',
            live: true,
            prompt: 'Vamos a probar. Toca la bandera verde y mueve tu dedo por el escenario.',
            blocks: [],
            check: movedSinceFlag('Dinosaurio'),
            hintTarget: {greenFlag: true},
            cannedHints: [
                '¿Dónde está la bandera verde?',
                'La bandera verde está arriba del escenario.',
                'Mira la bandera que brilla. Tócala y mueve tu dedo por el escenario.'
            ],
            why: 'Al probar tu juego ves si los bloques hacen lo que tú quieres.',
            tip: 'En este paso no falta ningún bloque. Tiene que tocar la bandera verde, que está arriba del ' +
                'escenario, y luego mover el dedo sobre el escenario. En el nivel 3 lo que brilla es la bandera verde.'
        },
        {
            id: 'comida-bandera',
            sprite: 'Comida',
            prompt: 'Ahora le toca a la comida. Tócala debajo del escenario y ponle un bloque de bandera verde.',
            blocks: ['event_whenflagclicked'],
            check: hasScript('Comida', ['event_whenflagclicked']),
            hintTarget: {palette: 'event_whenflagclicked'},
            cannedHints: [
                '¿Con qué bloque empezó el programa de tu dinosaurio?',
                'Es el bloque amarillo con la bandera verde. Está en Eventos.',
                'Mira el bloque que brilla. Arrástralo al centro.'
            ],
            why: 'La comida necesita su propio programa, que también empieza con la bandera verde.',
            tip: 'Cada objeto tiene su propio programa. El área de programas de la comida empieza vacía.'
        },
        {
            id: 'comida-arriba',
            sprite: 'Comida',
            prompt: 'Pega debajo de la bandera el bloque azul "ir a x: y:". Así la comida empieza arriba.',
            blocks: ['event_whenflagclicked', 'motion_gotoxy'],
            check: hasScript('Comida', [
                'event_whenflagclicked',
                {op: 'motion_gotoxy', num: {Y: {min: 50, max: 140}}}
            ]),
            hintTarget: {palette: 'motion_gotoxy'},
            cannedHints: [
                '¿Dónde quieres que empiece la comida?',
                'Es un bloque azul de Movimiento que dice "ir a x: y:".',
                'Mira el bloque que brilla. Pégalo debajo de la bandera.'
            ],
            why: 'Cada vez que empieza el juego, la comida vuelve a la parte de arriba.',
            tip: 'El número de la y tiene que estar entre 50 y 140; 120 funciona bien. Un número se cambia ' +
                'tocándolo. Si el bloque ya está pegado y sigue faltando, lo que falta es corregir ese número.'
        },
        {
            id: 'comida-por-siempre',
            sprite: 'Comida',
            prompt: 'Pega un "por siempre" debajo de "ir a x: y:".',
            blocks: ['motion_gotoxy', 'control_forever'],
            check: hasScript('Comida', ['event_whenflagclicked', 'motion_gotoxy', 'control_forever']),
            hintTarget: {palette: 'control_forever'},
            cannedHints: [
                '¿Qué bloque usaste para que tu dinosaurio no parara nunca?',
                'Es el bloque naranja con forma de boca. Está en Control.',
                'Mira el bloque que brilla. Pégalo debajo de "ir a x: y:".'
            ],
            why: 'La comida tiene que moverse todo el tiempo, igual que tu dinosaurio.'
        },
        {
            id: 'comida-cae',
            sprite: 'Comida',
            prompt: 'Mete "cambiar y en" dentro de "por siempre". Toca el número y escribe -5.',
            blocks: ['control_forever', 'motion_changeyby'],
            check: foodLoop({op: 'motion_changeyby', num: {DY: {max: -1}}}),
            hintTarget: {palette: 'motion_changeyby'},
            cannedHints: [
                '¿Hacia dónde tiene que moverse la comida para caer?',
                'Es un bloque azul de Movimiento que dice "cambiar y en".',
                'Mira el bloque que brilla. Mételo dentro de "por siempre" y cambia el número por -5.'
            ],
            why: 'La y dice qué tan arriba está la comida. Con un número con menos, la comida baja.',
            tip: 'El número tiene que ser negativo para que la comida baje; -5 funciona bien. Si el bloque ya ' +
                'está dentro de "por siempre" y sigue faltando, lo que falta es cambiar su número por -5.'
        },
        {
            id: 'si',
            sprite: 'Comida',
            prompt: 'Mete el bloque "si entonces" dentro de "por siempre", debajo de "cambiar y en".',
            blocks: ['control_forever', 'motion_changeyby', 'control_if'],
            check: foodLoop('control_if'),
            hintTarget: {palette: 'control_if'},
            cannedHints: [
                '¿Qué bloque sirve para preguntar si pasa algo?',
                'Es un bloque naranja de Control que dice "si" y "entonces".',
                'Mira el bloque que brilla. Mételo dentro de "por siempre".'
            ],
            why: 'El bloque "si" hace una pregunta. Solo si la respuesta es sí, hace lo que tiene adentro.'
        },
        {
            id: 'tocando',
            sprite: 'Comida',
            prompt: 'Busca el bloque celeste "¿tocando?". Mételo en el hueco del "si" y elige Dinosaurio.',
            blocks: ['control_if', 'sensing_touchingobject'],
            check: foodLoop({
                op: 'control_if',
                inputs: {
                    CONDITION: {op: 'sensing_touchingobject', menu: {TOUCHINGOBJECTMENU: 'Dinosaurio'}}
                }
            }),
            hintTarget: {palette: 'sensing_touchingobject'},
            cannedHints: [
                '¿Qué quieres preguntar sobre la comida y tu dinosaurio?',
                'Es un bloque celeste con puntas. Está en Sensores.',
                'Mira el bloque que brilla. Mételo en el hueco del "si" y elige Dinosaurio.'
            ],
            why: 'Así el juego pregunta todo el tiempo si tu dinosaurio ya atrapó la comida.',
            tip: 'El bloque "¿tocando ...?" va en el hueco con puntas del bloque "si ... entonces". Al sacarlo dice ' +
                '"puntero del ratón"; hay que tocar esa flechita y elegir Dinosaurio. Si el bloque ya está en el ' +
                'hueco y sigue faltando, lo que falta es elegir Dinosaurio.'
        },
        {
            id: 'otra-comida',
            sprite: 'Comida',
            prompt: 'Mete el bloque azul "ir a posición aleatoria" dentro del "si".',
            blocks: ['control_if', 'motion_goto'],
            check: foodLoop({op: 'control_if', body: [{op: 'motion_goto', menu: {TO: '_random_'}}]}),
            hintTarget: {palette: 'motion_goto'},
            cannedHints: [
                '¿Qué debe pasar con la comida cuando tu dinosaurio la atrapa?',
                'Es un bloque azul de Movimiento que dice "ir a posición aleatoria".',
                'Mira el bloque que brilla. Mételo dentro de la boca del "si".'
            ],
            why: 'Cuando tu dinosaurio atrapa la comida, aparece otra en un lugar sorpresa.',
            tip: 'El menú del bloque "ir a" tiene que decir "posición aleatoria", que es como sale de la lista.'
        },
        {
            id: 'puntos',
            sprite: 'Comida',
            prompt: 'Mete también "cambiar Puntos en 1" dentro del "si". Está en Variables.',
            blocks: ['control_if', 'data_changevariableby'],
            check: foodLoop({
                op: 'control_if',
                body: [{op: 'data_changevariableby', fields: {VARIABLE: 'Puntos'}, num: {VALUE: {min: 1}}}]
            }),
            hintTarget: {palette: 'data_changevariableby'},
            cannedHints: [
                '¿Cómo vas a saber cuánta comida atrapó tu dinosaurio?',
                'Es un bloque naranja de Variables que dice "cambiar Puntos en 1".',
                'Mira el bloque que brilla. Mételo dentro de la boca del "si".'
            ],
            why: 'Puntos es una cajita que guarda un número. Cada comida atrapada le suma uno.',
            tip: 'El bloque se llama "cambiar Puntos en 1" y está en la categoría Variables.'
        },
        {
            id: 'puntos-cero',
            sprite: 'Comida',
            prompt: 'Pega "fijar Puntos a 0" justo debajo de la bandera de la comida.',
            blocks: ['event_whenflagclicked', 'data_setvariableto', 'control_forever'],
            check: hasScript('Comida', [
                'event_whenflagclicked',
                {op: 'data_setvariableto', fields: {VARIABLE: 'Puntos'}, num: {VALUE: {min: 0, max: 0}}},
                'control_forever'
            ]),
            hintTarget: {palette: 'data_setvariableto'},
            cannedHints: [
                '¿Con cuántos puntos debe empezar cada juego?',
                'Es un bloque naranja de Variables que dice "fijar Puntos a 0".',
                'Mira el bloque que brilla. Pégalo debajo de la bandera, arriba de "por siempre".'
            ],
            why: 'Así cada juego nuevo empieza con cero puntos.',
            tip: 'El bloque "fijar Puntos a 0" tiene que quedar arriba de "por siempre", no adentro.'
        },
        {
            id: 'jugar',
            live: true,
            prompt: '¡Tu juego está listo! Toca la bandera verde y atrapa la comida cinco veces.',
            blocks: [],
            check: scoredSinceFlag('Puntos', 5),
            hintTarget: {greenFlag: true},
            cannedHints: [
                '¿Cuántos puntos tienes ahora?',
                'Toca la bandera verde y lleva tu dinosaurio hasta la comida.',
                'Mira la bandera que brilla. Tócala y atrapa la comida con tu dinosaurio.'
            ],
            why: 'Jugar tu propio juego es la mejor manera de ver que todo funciona.',
            tip: 'En este paso no falta ningún bloque. Tiene que tocar la bandera verde y llevar el dinosaurio ' +
                'con el dedo hasta la comida, hasta llegar a 5 puntos. En el nivel 3 lo que brilla es la bandera verde.'
        }
    ]
};

export default lesson;
