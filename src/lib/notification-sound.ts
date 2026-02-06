let audioContext: AudioContext | null = null
let userHasInteracted = false

/**
 * Activate audio context after first user interaction.
 * Must be called from a user gesture handler (click, keypress, etc.)
 */
export function enableNotificationSound() {
  if (userHasInteracted) return
  userHasInteracted = true
  try {
    audioContext = new AudioContext()
    // Resume if suspended (autoplay policy)
    if (audioContext.state === "suspended") {
      audioContext.resume()
    }
  } catch {
    // Web Audio API not supported
  }
}

/**
 * Play a short, unobtrusive notification beep using Web Audio API.
 * Two quick tones: a short high note followed by a slightly lower note.
 */
export function playNotificationSound() {
  if (!userHasInteracted || !audioContext) return

  try {
    if (audioContext.state === "suspended") {
      audioContext.resume()
    }

    const now = audioContext.currentTime

    // First tone
    const osc1 = audioContext.createOscillator()
    const gain1 = audioContext.createGain()
    osc1.type = "sine"
    osc1.frequency.value = 880 // A5
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc1.connect(gain1)
    gain1.connect(audioContext.destination)
    osc1.start(now)
    osc1.stop(now + 0.12)

    // Second tone (slightly lower, starts after first)
    const osc2 = audioContext.createOscillator()
    const gain2 = audioContext.createGain()
    osc2.type = "sine"
    osc2.frequency.value = 1047 // C6
    gain2.gain.setValueAtTime(0.12, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    osc2.connect(gain2)
    gain2.connect(audioContext.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.2)
  } catch {
    // Silently fail if audio cannot be played
  }
}
