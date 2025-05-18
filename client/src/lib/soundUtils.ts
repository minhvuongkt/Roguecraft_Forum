/**
 * Minecraft Sound Utility Service
 * Handles loading and playing sound effects for the Minecraft UI
 */

// Define sound types
export type MinecraftSoundType = 
  | 'click'       // Button click sound
  | 'pop'         // UI pop-up sound
  | 'send'        // Message sent sound
  | 'receive'     // Message received sound
  | 'error'       // Error notification sound
  | 'notification' // Notification sound
  | 'hover';      // UI hover sound

// Define paths to sound files
const soundPaths: Record<MinecraftSoundType, string> = {
  click: '/sounds/minecraft_click.mp3',
  pop: '/sounds/minecraft_pop.mp3',
  send: '/sounds/minecraft_send.mp3',
  receive: '/sounds/minecraft_receive.mp3',
  error: '/sounds/minecraft_error.mp3',
  notification: '/sounds/minecraft_notification.mp3',
  hover: '/sounds/minecraft_hover.mp3'
};

// Audio objects cache
const audioCache: Record<MinecraftSoundType, HTMLAudioElement | null> = {
  click: null,
  pop: null,
  send: null,
  receive: null,
  error: null,
  notification: null,
  hover: null
};

// Sound enabled flag (can be toggled by user)
let soundEnabled = true;

/**
 * Preload all sound effects
 */
export const preloadSounds = (): void => {
  Object.entries(soundPaths).forEach(([key, path]) => {
    try {
      const audio = new Audio(path);
      audio.volume = 0.5; // Default volume 50%
      audio.preload = 'auto';
      audioCache[key as MinecraftSoundType] = audio;
    } catch (error) {
      console.error(`Failed to preload sound: ${path}`, error);
    }
  });
};

/**
 * Play a Minecraft sound effect
 * @param type The type of sound to play
 * @param volume Optional volume level (0.0 to 1.0)
 */
export const playSound = (type: MinecraftSoundType, volume = 0.5): void => {
  if (!soundEnabled) return;

  try {
    let audio = audioCache[type];

    // Create audio element if not cached
    if (!audio) {
      audio = new Audio(soundPaths[type]);
      audioCache[type] = audio;
    }

    // Reset and play
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(err => {
      console.error(`Error playing sound ${type}:`, err);
    });
  } catch (error) {
    console.error(`Failed to play sound: ${type}`, error);
  }
};

/**
 * Enable or disable all sounds
 */
export const setSoundEnabled = (enabled: boolean): void => {
  soundEnabled = enabled;
  localStorage.setItem('minecraft-sounds-enabled', enabled.toString());
};

/**
 * Get current sound enabled status
 */
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

/**
 * Initialize sound settings from localStorage
 */
export const initSoundSettings = (): void => {
  const savedSetting = localStorage.getItem('minecraft-sounds-enabled');
  if (savedSetting !== null) {
    soundEnabled = savedSetting === 'true';
  }
};

/**
 * Setup global event listeners for Minecraft sounds
 */
export const setupSoundEventListeners = (): void => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Check if the clicked element has the minecraft-button class
    if (target.closest('.minecraft-button') || target.closest('.minecraft-styled-button')) {
      playSound('click');
    }
  });

  // Add hover sound for minecraft buttons
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.minecraft-hover-sound')) {
      playSound('hover', 0.3);
    }
  });
};

// Initialize sounds
export const initMinecraftSounds = (): void => {
  initSoundSettings();
  preloadSounds();
  // Setup events on client side only
  if (typeof window !== 'undefined') {
    setupSoundEventListeners();
  }
};
