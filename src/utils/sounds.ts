/**
 * Sound utilities for ArkAgentic
 * Generates cute notification sounds using Web Audio API
 */

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a "join" sound - ascending pleasant chime
 */
export function playJoinSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create oscillator for the tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Pleasant ascending notes (C5 -> E5 -> G5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    
    // Quick fade in and out
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.25);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // Audio not available
  }
}

/**
 * Play a "leave" sound - descending soft tone
 */
export function playLeaveSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Descending notes (G5 -> E5 -> C5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, now); // G5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(523.25, now + 0.2); // C5
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.25);
    gain.gain.linearRampToValueAtTime(0, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    // Audio not available
  }
}

/**
 * Play a "player nearby" sound - subtle soft ping
 */
export function playPlayerNearbySound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Single soft high note
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    // Audio not available
  }
}

/**
 * Play a notification "pop" sound
 */
export function playPopSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    // Audio not available
  }
}

/**
 * Play an error/disconnect sound
 */
export function playErrorSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Two descending notes
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(300, now + 0.15);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    // Audio not available
  }
}

export default {
  playJoinSound,
  playLeaveSound,
  playPlayerNearbySound,
  playPopSound,
  playErrorSound,
};
