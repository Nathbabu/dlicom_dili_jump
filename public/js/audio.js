// ==========================================================================
// DILI JUMP - PROCEDURAL SYNTH SOUND ENGINE (WEB AUDIO API)
// ==========================================================================

const SoundEngine = (function() {
  let ctx = null;
  let muted = false;

  function init() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // Helper tone player
  function playTone(freq, type, duration, startVol = 0.3, endVol = 0) {
    if (muted || !ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(startVol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVol), ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  return {
    init: init,
    toggleMute: function() {
      muted = !muted;
      return muted;
    },
    isMuted: function() { return muted; },

    // 1. Regular Bounce on Neon Platform
    bounce: function(combo = 1) {
      init();
      if (muted || !ctx) return;
      const baseFreq = 380 + Math.min(300, combo * 25);
      playTone(baseFreq, 'sine', 0.12, 0.25, 0.01);
      setTimeout(() => playTone(baseFreq * 1.35, 'triangle', 0.08, 0.15, 0.01), 30);
    },

    // 2. Spring Booster Launch
    spring: function() {
      init();
      if (muted || !ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    },

    // 3. Jetpack Rocket Thrusters
    jetpack: function() {
      init();
      if (muted || !ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {}
    },

    // 4. Glass Platform Shatter
    shatter: function() {
      init();
      if (muted || !ctx) return;
      playTone(180, 'square', 0.1, 0.2, 0.01);
      playTone(120, 'sawtooth', 0.15, 0.25, 0.01);
    },

    // 5. Crystal Pickup Sparkle
    crystal: function() {
      init();
      if (muted || !ctx) return;
      playTone(880, 'sine', 0.1, 0.2, 0.01);
      setTimeout(() => playTone(1320, 'sine', 0.15, 0.2, 0.01), 60);
      setTimeout(() => playTone(1760, 'sine', 0.2, 0.25, 0.01), 120);
    },

    // 6. Game Over Drop Sound
    gameOver: function() {
      init();
      if (muted || !ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch (e) {}
    },

    // 7. UI Click
    click: function() {
      init();
      playTone(600, 'sine', 0.04, 0.15, 0.01);
    }
  };
})();
