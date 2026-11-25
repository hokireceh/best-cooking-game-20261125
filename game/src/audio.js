// Dapur Kilat — sound: every effect and the music loop are synthesised live
// with WebAudio. No audio files, no network: the kitchen hums from oscillators
// and filtered noise alone. The context is created on the first user gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sizzle = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  // A cheerful 8-step loop: walking bass under a plucky pentatonic melody.
  // 116 BPM, one step per 8th note; the rush section plays it a step faster.
  const BASS = [110, 0, 131, 0, 98, 0, 147, 0];
  const MELODY = [330, 392, 494, 392, 440, 494, 587, 494];

  function scheduleMusic(rush) {
    if (!ctx || muted) return;
    const i = step % 8;
    if (BASS[i]) tone(BASS[i], 0.22, 'triangle', 0.5);
    if (MELODY[i]) tone(MELODY[i], 0.16, 'square', 0.12);
    if (i === 0 || i === 4) noiseBurst(0.05, 0.1, 6000);
    step += 1;
    musicTimer = window.setTimeout(() => scheduleMusic(rush), rush ? 210 : 258);
  }

  return {
    unlock() {
      if (ensure()) {
        if (!musicTimer) scheduleMusic(false);
      }
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
      if (muted && musicTimer) {
        window.clearTimeout(musicTimer);
        musicTimer = null;
      } else if (!muted && ctx && !musicTimer) {
        scheduleMusic(false);
      }
    },
    isMuted() {
      return muted;
    },
    pickup() {
      if (!ensure()) return;
      tone(620, 0.09, 'square', 0.15, 0, 880);
    },
    place() {
      if (!ensure()) return;
      tone(300, 0.08, 'triangle', 0.2, 0, 210);
    },
    chop() {
      if (!ensure()) return;
      noiseBurst(0.07, 0.35, 2400);
      tone(180, 0.05, 'square', 0.1);
    },
    chopDone() {
      if (!ensure()) return;
      tone(520, 0.1, 'sine', 0.25);
      tone(780, 0.14, 'sine', 0.25, 0.08);
    },
    sizzleStart() {
      if (!ensure() || sizzle) return;
      const len = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3200;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
      sizzle = { src, gain };
    },
    sizzleStop() {
      if (!sizzle) return;
      try {
        sizzle.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        sizzle.src.stop(ctx.currentTime + 0.3);
      } catch {
        // Already stopped; nothing to clean up.
      }
      sizzle = null;
    },
    serve() {
      if (!ensure()) return;
      tone(880, 0.16, 'sine', 0.3);
      tone(1318, 0.28, 'sine', 0.3, 0.1);
    },
    error() {
      if (!ensure()) return;
      tone(160, 0.18, 'sawtooth', 0.18, 0, 110);
    },
    expired() {
      if (!ensure()) return;
      tone(392, 0.15, 'triangle', 0.22, 0, 311);
      tone(311, 0.25, 'triangle', 0.22, 0.14, 233);
    },
    tick() {
      if (!ensure()) return;
      tone(980, 0.05, 'square', 0.08);
    },
  };
}
