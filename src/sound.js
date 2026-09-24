let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** A short synthesized "wet thud" for a symbiote smash - no audio files needed. */
export function playSmashSound() {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  const noise = ctx.createBufferSource();
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  noise.buffer = noiseBuffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);

  osc.connect(gain).connect(ctx.destination);
  noise.connect(noiseGain).connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.22);
  noise.start(now);
  noise.stop(now + 0.08);
}

/** A rising, sludgy synthesized tone for the symbiote taking over a host. */
export function playPossessSound() {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(2200, now + 0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.55);
}
