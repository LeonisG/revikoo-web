// All sound is synthesized locally. No network requests or autoplay on page load.
export function createAudio() {
  let context, master, ambience, lowpass, drone, droneGain, preferences, focusing = false;
  async function unlock() {
    if (!preferences?.sound) return;
    try {
      if (!context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        context = new Context();
        master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
        ambience = context.createGain(); ambience.gain.value = 0;
        lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 420;
        const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
        const data = buffer.getChannelData(0); let previous = 0;
        for (let i = 0; i < data.length; i++) { previous = (previous + (Math.random() * 2 - 1) * .025) / 1.025; data[i] = previous * 4; }
        const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        noise.connect(lowpass); lowpass.connect(ambience); ambience.connect(master); noise.start();
        drone = context.createOscillator(); drone.type = 'sine'; drone.frequency.value = 110;
        droneGain = context.createGain(); droneGain.gain.value = 0; drone.connect(droneGain); droneGain.connect(master); drone.start();
      }
      if (context.state === 'suspended') await context.resume();
      update(preferences, focusing);
    } catch { /* Audio is optional; browser/device restrictions never block the room. */ }
  }
  function update(prefs, focus = false) {
    preferences = prefs; focusing = focus;
    if (!context) return;
    const audible = preferences.sound && !document.hidden;
    master.gain.setTargetAtTime(audible ? .5 : 0, context.currentTime, .3);
    ambience.gain.setTargetAtTime((preferences.ambient / 100) * (preferences.weather === 'rain' ? .32 : .065), context.currentTime, .8);
    lowpass.frequency.setTargetAtTime(preferences.weather === 'rain' ? 1800 : 420, context.currentTime, .8);
    droneGain.gain.setTargetAtTime(focus ? .015 * preferences.ambient / 100 : 0, context.currentTime, 1);
  }
  function play(kind = 'page') {
    if (!context || !preferences?.sound || context.state !== 'running') return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    const tones = { page: 240, switch: 160, reward: 660, cat: 320 };
    oscillator.frequency.value = tones[kind] || 240;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0, context.currentTime); gain.gain.linearRampToValueAtTime(.035, context.currentTime + .012); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .22);
    oscillator.connect(gain); gain.connect(master); oscillator.start(); oscillator.stop(context.currentTime + .25);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  return { unlock, update, play };
}
