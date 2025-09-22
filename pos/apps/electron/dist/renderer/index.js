"use strict";
/**
 * renderer/index.tsx
 * -----------------------------------------
 * Entry script for the renderer bundle (Phase 0 placeholder).
 * For now it only verifies the preload bridge is present. Future phases
 * will mount React components (StatusBar, BookingList, etc.).
 */
console.log('[RENDERER] POS Hub renderer loaded');
const el = document.getElementById('status');
if (el) {
    const pong = window.kgolf?.ping?.() || 'no-bridge';
    el.textContent = 'Renderer script executed. preload ping => ' + pong;
}
