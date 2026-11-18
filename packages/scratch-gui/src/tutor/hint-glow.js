// Makes one block in the palette pulse so the learner can find it.
import * as ScratchBlocks from 'scratch-blocks';

import log from '../lib/log.js';

const GLOW_CLASS = 'tutor-glow';
const GLOW_MS = 12000;
const TOP_MARGIN_PX = 40;

// The palette's own "script is running" glow is cleared by the VM, so hints use a separate class.
// Thick outline flashing white and yellow inside a wide pink halo: visible on every block colour.
const GLOW_CSS = `
.${GLOW_CLASS} {
    animation: tutor-glow-halo 0.6s ease-in-out infinite alternate;
}
.${GLOW_CLASS} > .blocklyPath {
    stroke-width: 9px !important;
    animation: tutor-glow-outline 0.6s ease-in-out infinite alternate;
}
.${GLOW_CLASS}-box {
    outline: 5px solid #ffe600;
    border-radius: 0.5rem;
    animation: tutor-glow-halo 0.6s ease-in-out infinite alternate;
}
@keyframes tutor-glow-halo {
    from { filter: drop-shadow(0 0 4px #ff1493) drop-shadow(0 0 8px #ff1493); }
    to { filter: drop-shadow(0 0 10px #ff1493) drop-shadow(0 0 22px #ff1493) drop-shadow(0 0 36px #ff1493); }
}
@keyframes tutor-glow-outline {
    from { stroke: #ffffff; }
    to { stroke: #ffe600; }
}`;

let glowingRoot = null;
let glowTimer = null;

const ensureStyle = () => {
    if (document.getElementById('tutor-glow-style')) return;
    const style = document.createElement('style');
    style.id = 'tutor-glow-style';
    style.textContent = GLOW_CSS;
    document.head.appendChild(style);
};

const clearGlow = () => {
    clearTimeout(glowTimer);
    if (glowingRoot) glowingRoot.classList.remove(GLOW_CLASS, `${GLOW_CLASS}-box`);
    glowingRoot = null;
};

/**
 * Scrolls the palette to the block's category and makes the block pulse for a few seconds.
 * @param {string} opcode - block type, e.g. 'control_forever'
 */
const glowPaletteBlock = opcode => {
    clearGlow();
    const workspace = ScratchBlocks.getMainWorkspace();
    if (!workspace || !workspace.getFlyout()) return;
    ensureStyle();

    // Palette blocks are recycled, so the block is looked up at the moment it is needed.
    const palette = workspace.getFlyout().getWorkspace();
    const [block] = palette.getBlocksByType(opcode);
    if (!block) {
        log.warn(`glowPaletteBlock: no "${opcode}" block in the palette`);
        return;
    }
    // Scroll so the block sits a little below the top edge of the palette.
    const blockTop = block.getRelativeToSurfaceXY().y * palette.scale;
    palette.scrollbar.setY(Math.max(0, blockTop - TOP_MARGIN_PX));

    glowingRoot = block.getSvgRoot();
    glowingRoot.classList.add(GLOW_CLASS);
    glowTimer = setTimeout(clearGlow, GLOW_MS);
};

/**
 * Makes the green flag above the stage pulse for a few seconds.
 */
const glowGreenFlag = () => {
    clearGlow();
    const flag = document.querySelector('img[class*="green-flag_green-flag"]');
    if (!flag) {
        log.warn('glowGreenFlag: no green flag on the page');
        return;
    }
    ensureStyle();
    glowingRoot = flag;
    glowingRoot.classList.add(`${GLOW_CLASS}-box`);
    glowTimer = setTimeout(clearGlow, GLOW_MS);
};

export {clearGlow, glowGreenFlag, glowPaletteBlock};
