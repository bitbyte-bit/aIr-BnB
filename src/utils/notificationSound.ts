// Notification utility for playing beep sounds and vibration
let audioContext: AudioContext | null = null;

// Initialize AudioContext lazily (requires user interaction first)
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Play a beep sound using the Web Audio API
 * @param frequency - The frequency in Hz (default: 800)
 * @param duration - The duration in ms (default: 200)
 * @param type - The type of oscillator (default: 'sine')
 */
export const playBeep = (
  frequency: number = 800,
  duration: number = 200,
  type: OscillatorType = 'sine'
): void => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    // Volume envelope to avoid clicking
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.error('Failed to play beep sound:', error);
  }
};

/**
 * Play a notification sound with a pleasant tone sequence
 */
export const playNotificationSound = (): void => {
  // Play a sequence of beeps for a more noticeable notification
  playBeep(800, 100, 'sine');
  setTimeout(() => playBeep(1000, 100, 'sine'), 150);
  setTimeout(() => playBeep(1200, 150, 'sine'), 300);
};

/**
 * Vibrate the device
 * @param pattern - Vibration pattern (default: [200, 100, 200])
 */
export const vibrateDevice = (pattern: number[] = [200, 100, 200]): void => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.error('Failed to vibrate device:', error);
  }
};

/**
 * Play notification sound and vibrate
 * This works when the app is OPEN
 */
export const playNotificationAlert = (): void => {
  playNotificationSound();
  vibrateDevice();
};
