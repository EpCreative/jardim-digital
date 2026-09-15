/**
 * An original, intentionally quiet garden soundscape. No audio is created until
 * setEnabled(true) is called from a user gesture. Everything is synthesized.
 */
export function createAmbience() {
  let context = null;
  let master = null;
  let windGain = null;
  let waterGain = null;
  let eveningGain = null;
  let desiredEnabled = false;
  let enabled = false;
  let evening = false;
  let disposed = false;
  let revision = 0;
  let birdTimer = null;
  let suspendTimer = null;
  let stateListener = null;
  const continuousSources = new Set();
  const graphNodes = new Set();
  const birdVoices = new Set();
  const random = (min, max) => min + Math.random() * (max - min);

  function remember(node) {
    graphNodes.add(node);
    return node;
  }

  function clearBirdTimer() {
    if (birdTimer !== null) globalThis.clearTimeout(birdTimer);
    birdTimer = null;
  }

  function clearSuspendTimer() {
    if (suspendTimer !== null) globalThis.clearTimeout(suspendTimer);
    suspendTimer = null;
  }

  function fade(parameter, value, duration = 0.15) {
    if (!context || context.state === 'closed') return;
    const now = context.currentTime;
    if (typeof parameter.cancelAndHoldAtTime === 'function') {
      parameter.cancelAndHoldAtTime(now);
    } else {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
    }
    parameter.linearRampToValueAtTime(value, now + duration);
  }

  function applyTimeOfDay() {
    if (!windGain) return;
    fade(windGain.gain, evening ? 0.078 : 0.065, 1.8);
    fade(waterGain.gain, evening ? 0.023 : 0.025, 1.8);
    fade(eveningGain.gain, evening ? 0.004 : 0, 1.8);
  }

  function makeNoise(seconds, pink = false) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let smoothed = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const white = Math.random() * 2 - 1;
      smoothed = smoothed * 0.985 + white * 0.015;
      samples[i] = pink ? smoothed * 4.8 : white * 0.65;
    }
    // Matching the loop edges prevents a click at the buffer boundary.
    const edge = Math.min(2048, Math.floor(samples.length / 4));
    for (let i = 0; i < edge; i += 1) {
      const blend = i / edge;
      samples[i] *= blend;
      samples[samples.length - i - 1] *= blend;
    }
    const source = remember(context.createBufferSource());
    source.buffer = buffer;
    source.loop = true;
    continuousSources.add(source);
    source.start();
    return source;
  }

  function makeFilter(type, frequency, q = 0.5) {
    const node = remember(context.createBiquadFilter());
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q;
    return node;
  }

  function modulate(parameter, frequency, depth) {
    const oscillator = remember(context.createOscillator());
    const strength = remember(context.createGain());
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    strength.gain.value = depth;
    oscillator.connect(strength);
    strength.connect(parameter);
    continuousSources.add(oscillator);
    oscillator.start();
  }

  function initialize() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Este navegador não oferece áudio ambiente.');
    context = new AudioContextClass({ latencyHint: 'playback' });
    master = remember(context.createGain());
    master.gain.value = 0;
    master.connect(context.destination);

    const breeze = makeNoise(7.3, true);
    const windFilter = makeFilter('lowpass', 570);
    const windHighPass = makeFilter('highpass', 100);
    windGain = remember(context.createGain());
    windGain.gain.value = evening ? 0.078 : 0.065;
    breeze.connect(windHighPass);
    windHighPass.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    modulate(windFilter.frequency, 0.073, 210);
    modulate(windGain.gain, 0.119, 0.022);

    const water = makeNoise(5.7);
    const waterLow = makeFilter('lowpass', 4200, 0.4);
    const waterHigh = makeFilter('highpass', 950, 0.4);
    waterGain = remember(context.createGain());
    waterGain.gain.value = evening ? 0.023 : 0.025;
    water.connect(waterHigh);
    waterHigh.connect(waterLow);
    waterLow.connect(waterGain);
    waterGain.connect(master);
    modulate(waterGain.gain, 0.61, 0.005);
    modulate(waterLow.frequency, 0.39, 450);

    // A very distant, broad insect rustle replaces frequent birds at dusk.
    const insectFilter = makeFilter('bandpass', 3300, 2.1);
    const insectPulse = remember(context.createGain());
    insectPulse.gain.value = 0.5;
    eveningGain = remember(context.createGain());
    eveningGain.gain.value = evening ? 0.004 : 0;
    water.connect(insectFilter);
    insectFilter.connect(insectPulse);
    insectPulse.connect(eveningGain);
    eveningGain.connect(master);
    modulate(insectPulse.gain, 19.6, 0.22);

    stateListener = () => {
      if (!context || disposed) return;
      if (context.state !== 'running') {
        clearBirdTimer();
      } else if (enabled && desiredEnabled && birdTimer === null) {
        scheduleBird(random(900, 2000));
      }
    };
    context.addEventListener('statechange', stateListener);
  }

  function chirp(startAt, baseFrequency, duration, pan, volume) {
    if (!context || context.state !== 'running') return;
    const main = context.createOscillator();
    const overtone = context.createOscillator();
    const overtoneGain = context.createGain();
    const envelope = context.createGain();
    const position = typeof context.createStereoPanner === 'function'
      ? context.createStereoPanner()
      : context.createGain();
    if (position.pan) position.pan.value = pan;
    main.type = 'sine';
    overtone.type = 'sine';
    overtoneGain.gain.value = 0.095;
    const crest = baseFrequency * random(1.22, 1.48);
    for (const [oscillator, ratio] of [[main, 1], [overtone, 1.96]]) {
      oscillator.frequency.setValueAtTime(baseFrequency * ratio, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(crest * ratio, startAt + duration * 0.29);
      oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * ratio * 0.91, startAt + duration);
    }
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(volume, startAt + 0.013);
    envelope.gain.exponentialRampToValueAtTime(0.00001, startAt + duration);
    envelope.gain.setValueAtTime(0, startAt + duration + 0.02);
    main.connect(envelope);
    overtone.connect(overtoneGain);
    overtoneGain.connect(envelope);
    envelope.connect(position);
    position.connect(master);
    const nodes = [main, overtone, overtoneGain, envelope, position];
    let cleaned = false;
    const voice = {
      stop() {
        if (cleaned || !context || context.state === 'closed') return;
        fade(envelope.gain, 0, 0.045);
        for (const oscillator of [main, overtone]) {
          try { oscillator.stop(context.currentTime + 0.05); } catch { /* Already ended. */ }
        }
      },
      clean() {
        if (cleaned) return;
        cleaned = true;
        for (const node of nodes) node.disconnect();
        birdVoices.delete(voice);
      },
    };
    birdVoices.add(voice);
    main.onended = voice.clean;
    main.start(startAt);
    overtone.start(startAt);
    main.stop(startAt + duration + 0.04);
    overtone.stop(startAt + duration + 0.04);
  }

  function scheduleBird(delay) {
    clearBirdTimer();
    if (!enabled || !desiredEnabled || disposed || context?.state !== 'running') return;
    birdTimer = globalThis.setTimeout(() => {
      birdTimer = null;
      if (!enabled || !desiredEnabled || disposed || context?.state !== 'running') return;
      const count = evening ? 2 : Math.floor(random(2, 5));
      const base = random(1850, 2950);
      const pan = random(-0.78, 0.78);
      let at = context.currentTime + 0.025;
      for (let i = 0; i < count; i += 1) {
        const duration = random(0.10, 0.19);
        chirp(at, base * random(0.94, 1.06), duration, pan, evening ? 0.015 : 0.022);
        at += duration + random(0.09, 0.23);
      }
      scheduleBird(evening ? random(10000, 18000) : random(4200, 9500));
    }, delay);
  }

  async function setEnabled(value) {
    if (disposed) {
      if (value) throw new Error('O áudio ambiente já foi encerrado.');
      return false;
    }
    const request = ++revision;
    desiredEnabled = Boolean(value);
    clearSuspendTimer();
    clearBirdTimer();

    if (!desiredEnabled) {
      enabled = false;
      for (const voice of birdVoices) voice.stop();
      if (context && context.state !== 'closed') {
        fade(master.gain, 0, 0.09);
        suspendTimer = globalThis.setTimeout(() => {
          suspendTimer = null;
          if (!desiredEnabled && !disposed && context?.state === 'running') {
            context.suspend().catch(() => {});
          }
        }, 130);
      }
      return false;
    }

    try {
      // This synchronous construction/resume begins within the user's gesture.
      if (!context || context.state === 'closed') initialize();
      await context.resume();
      if (request !== revision || disposed) return enabled;
      if (context.state !== 'running') throw new Error('O navegador não conseguiu iniciar o áudio.');
      enabled = true;
      fade(master.gain, 0.66, 0.65);
      scheduleBird(random(900, 1700));
      return true;
    } catch (error) {
      if (request !== revision || disposed) return enabled;
      enabled = false;
      desiredEnabled = false;
      clearBirdTimer();
      if (master) fade(master.gain, 0);
      throw new Error('Não foi possível ativar o som ambiente neste navegador.', { cause: error });
    }
  }

  function setEvening(value) {
    if (disposed) return;
    const next = Boolean(value);
    if (next === evening) return;
    evening = next;
    applyTimeOfDay();
    if (enabled) scheduleBird(evening ? random(6500, 12000) : random(1800, 4200));
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    desiredEnabled = false;
    enabled = false;
    revision += 1;
    clearBirdTimer();
    clearSuspendTimer();
    if (context && stateListener) context.removeEventListener('statechange', stateListener);
    for (const voice of [...birdVoices]) {
      voice.stop();
      voice.clean();
    }
    for (const source of continuousSources) {
      try { source.stop(); } catch { /* Context or source already stopped. */ }
    }
    continuousSources.clear();
    for (const node of graphNodes) node.disconnect();
    graphNodes.clear();
    if (context && context.state !== 'closed') context.close().catch(() => {});
    context = null;
    master = null;
    windGain = null;
    waterGain = null;
    eveningGain = null;
    stateListener = null;
  }

  return { setEnabled, setEvening, dispose };
}
