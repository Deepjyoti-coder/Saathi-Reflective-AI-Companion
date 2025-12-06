import { ModeId } from '../types';
import { INITIAL_GREETINGS } from '../constants';

/**
 * This service mocks the Python Backend + Sarvam + Gemini.
 * In a real app, this would be replaced by `fetch('/api/...')` calls defined in `api.ts`.
 */

const LATENCY_MS = 1500; // Simulate network/AI delay

export const mockStartSession = async (mode: ModeId): Promise<{ id: string; greeting: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: crypto.randomUUID(),
        greeting: INITIAL_GREETINGS[mode] || "Hello. I am listening.",
      });
    }, 600);
  });
};

export const mockSendMessage = async (
  sessionId: string,
  text: string,
  mode: ModeId
): Promise<{ replyText: string; emotionalTone: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const response = generateMockResponse(text, mode);
      resolve(response);
    }, LATENCY_MS);
  });
};

// Simple rule-based mocker to simulate "Intelligence" for the UI demo
const generateMockResponse = (input: string, mode: ModeId): { replyText: string; emotionalTone: string } => {
  const lower = input.toLowerCase();
  let tone = "neutral";
  let text = "";

  if (lower.includes("sad") || lower.includes("lonely") || lower.includes("hurt")) {
    tone = "sadness";
    if (mode === 'yogi') text = "I hear a heaviness in your words. Where do you feel this sadness in your body right now?";
    else if (mode === 'elder') text = "It is okay to feel this way. Grief and sadness are just seasons of the heart. Would you like to tell me what triggered this?";
    else if (mode === 'sufi') text = "Even the darkest night makes way for the dawn. This pain is also a guest. What does it want to tell you?";
    else text = "I hear you. It sounds like you are carrying a heavy burden.";
  } else if (lower.includes("anxious") || lower.includes("stress") || lower.includes("scared")) {
    tone = "anxiety";
    if (mode === 'yogi') text = "Notice the speed of your breath. Is it fast? Let's slow it down together. Inhale... Exhale...";
    else if (mode === 'teacher') text = "Anxiety often comes from focusing on outcomes we cannot control. Let's list what is actually in your hands right now.";
    else text = "It sounds like there is a lot of noise in your mind right now. Let's take a moment to pause.";
  } else if (lower.includes("job") || lower.includes("work") || lower.includes("career")) {
    tone = "ambitious/stressed";
    text = "Work is a part of life, but not the whole of it. Are you feeling fulfilled, or just busy?";
  } else {
    tone = "reflective";
    if (mode === 'monk') text = "I am listening. Go on.";
    else text = "I understand. Can you say a little more about that?";
  }

  return { replyText: text, emotionalTone: tone };
};

// Mock Sarvam STT
export const mockTranscribeAudio = async (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("I am feeling a bit overwhelmed today, actually."); // Hardcoded for demo
        }, 1000);
    })
}
