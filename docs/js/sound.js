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

  // ضجيج مُرشّح (للفرقعة والمسح)
  function noise(dur, fFrom, fTo, vol = 0.5) {
    const c = audioCtx();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    const t = c.currentTime;
    f.frequency.setValueAtTime(fFrom, t);
    f.frequency.exponentialRampToValueAtTime(fTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
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

  // فرقعة البالون
  function balloonPop() {
    noise(0.14, 3500, 700, 0.9);
    tone(500, 150, 0, 0.12, 0.25);
  }

  // مسح اللوحة
  function whoosh() {
    noise(0.5, 300, 3500, 0.5);
  }

  // نغمة موسيقية حسب رقم اللون
  function note(i) {
    const scale = [523, 587, 659, 784, 880, 1047];
    const f = scale[Math.abs(i) % scale.length];
    tone(f, f, 0, 0.3, 0.25, 'triangle');
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

  // نطق النص آلياً إذا ما فيه تسجيل
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

  return { boing, pop, balloonPop, whoosh, note, cheer, playBlob, speak, stop, stopSpeak, stopAll };
})();
