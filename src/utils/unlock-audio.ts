/**
 * Simple, battle-tested iOS audio unlock utility
 * 
 * Handles iPhone/iPad Safari/Chrome audio context activation with minimal complexity.
 * Uses both resume() and silent playback to fully unlock iOS WebKit audio.
 */

export async function unlockAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'running') return;

  let unlocked = false;

  // Gesture-qualified events to listen for
  const events: Array<keyof WindowEventMap> = [
    'pointerup',
    'click',
    'touchend',
    'keydown',
    'mousedown',
  ];

  // Keep references for cleanup
  const handlers: Array<{ type: keyof WindowEventMap; handler: (ev: any) => void; options?: AddEventListenerOptions }> = [];

  const cleanupAll = () => {
    handlers.forEach(({ type, handler, options }) => {
      try {
        window.removeEventListener(type, handler, options?.capture ?? true);
      } catch {}
    });
    try { document.removeEventListener('visibilitychange', onVis, true); } catch {}
  };

  const tryUnlock = async () => {
    if (unlocked) return;
    try {
      // iOS WebKit often needs BOTH: a resume() and a short, real playback
      if (ctx.state !== 'running') {
        await ctx.resume();
      }

      // Play a one-frame silent buffer to fully initialize the graph
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);

      unlocked = true;
      cleanupAll();
    } catch {
      // Keep waiting for another user gesture
    }
  };

  // Attach listeners (capture for reliability; passive where applicable)
  for (const type of events) {
    const options: AddEventListenerOptions =
      type === 'keydown' ? { capture: true } : { capture: true, passive: true };
    const handler = () => { 
      tryUnlock().catch(() => {
        // Silently handle unlock failures - they're expected until user gesture
      });
    };
    handlers.push({ type, handler, options });
    window.addEventListener(type, handler, options);
  }

  // Also handle tab switching (sometimes iOS resumes after returning)
  const onVis = async () => {
    if (document.visibilityState === 'visible' && ctx.state !== 'running') {
      await tryUnlock();
    }
    if (ctx.state === 'running') {
      unlocked = true;
      cleanupAll();
    }
  };
  document.addEventListener('visibilitychange', onVis, true);

  // If user interacted before this ran, do a first shot
  await tryUnlock();
}
