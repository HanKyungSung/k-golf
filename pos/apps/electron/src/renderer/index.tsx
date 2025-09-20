console.log('[RENDERER] POS Hub renderer loaded');
const el = document.getElementById('status');
if (el) {
	const pong = (window as any).kgolf?.ping?.() || 'no-bridge';
	el.textContent = 'Renderer script executed. preload ping => ' + pong;
}
