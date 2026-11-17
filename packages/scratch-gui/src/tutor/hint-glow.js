// Makes one block in the palette pulse so the learner can find it.
import * as ScratchBlocks from 'scratch-blocks';

import log from '../lib/log.js';

const GLOW_CLASS = 'tutor-glow';
const GLOW_MS = 8000;
const TOP_MARGIN_PX = 40;

// The palette's own "script is running" glow is cleared by the VM, so hints use a separate class.
// White outline with a pink halo: visible on every block colour.
const GLOW_CSS = `
.${GLOW_CLASS} {
    animation: tutor-glow-pulse 0.7s ease-in-out infinite alternate;
}
.${GLOW_CLASS} > .blocklyPath {
    stroke: #ffffff !important;
    stroke-width: 5px !important;
}
@keyframes tutor-glow-pulse {
    from { filter: drop-shadow(0 0 2px #ff1493); }
    to { filter: drop-shadow(0 0 6px #ff1493) drop-shadow(0 0 14px #ff1493); }
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
    if (glowingRoot) glowingRoot.classList.remove(GLOW_CLASS);
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

export {clearGlow, glowPaletteBlock};
