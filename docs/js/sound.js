// ===== الأصوات: مؤثرات بسيطة + تشغيل التسجيلات + النطق الآلي =====
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

  // نغمة واحدة
  function tone(freqFrom, freqTo, start, dur, vol = 0.35, type = 'sine') {
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqFrom, t);
    o.frequency.exponentialRampToValueAtTime(freqTo, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // "بوينغ" عند لمس البطاقات
  function boing() {
    tone(300, 900, 0, 0.18, 0.4);
    tone(900, 500, 0.15, 0.2, 0.3);
  }

  // "بخ!" عند فتح الشباك
  function pop() {
    tone(200, 1200, 0, 0.12, 0.45, 'triangle');
    tone(1200, 700, 0.1, 0.15, 0.25, 'sine');
  }

  // احتفال: سلم موسيقي صاعد
  function cheer() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, i * 0.09, 0.22, 0.3, 'triangle'));
  }

  function stop() {
    if (current) {
      const c = current;
      current = null;
      c.audio.onended = null;
      c.audio.onerror = null;
      c.audio.pause();
      URL.revokeObjectURL(c.url);
    }
  }

  // تشغيل تسجيل محفوظ، ويستدعي onEnd عند الانتهاء
  function playBlob(blob, onEnd) {
    stop();
    stopSpeak();
    if (!blob) { if (onEnd) onEnd(); return null; }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    current = { audio, url };
    const finish = () => {
      if (current && current.audio === audio) {
        stop();
        if (onEnd) onEnd();
      }
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
    return audio;
  }

  // نطق الاسم آلياً إذا ما فيه تسجيل
  function speak(text, onEnd) {
    stop();
    stopSpeak();
    const done = () => { if (onEnd) { const f = onEnd; onEnd = null; f(); } };
    if (!('speechSynthesis' in window)) { setTimeout(done, 600); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = I18N.lang === 'ar' ? 'ar-SA' : 'en-US';
    u.rate = 0.85;
    u.pitch = 1.2;
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
    setTimeout(done, 5000); // احتياط إذا ما وصل حدث الانتهاء
  }

  function stopSpeak() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function stopAll() {
    stop();
    stopSpeak();
  }

  return { boing, pop, cheer, playBlob, speak, stop, stopSpeak, stopAll };
})();
