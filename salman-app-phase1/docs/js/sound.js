// ===== الأصوات: مؤثرات بسيطة + تشغيل التسجيلات =====
const Sound = (() => {
  let ctx = null;
  let current = null;

  function audioCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C) ctx = new C();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // صوت "بوينغ" مرح عند اللمس
  function boing() {
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.15);
    o.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.4);
  }

  function stop() {
    if (current) {
      current.audio.pause();
      URL.revokeObjectURL(current.url);
      current = null;
    }
  }

  // تشغيل تسجيل محفوظ (Blob)
  function playBlob(blob) {
    stop();
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    current = { audio, url };
    audio.onended = () => {
      if (current && current.audio === audio) stop();
    };
    audio.play().catch(() => {});
    return audio;
  }

  return { boing, playBlob, stop };
})();
