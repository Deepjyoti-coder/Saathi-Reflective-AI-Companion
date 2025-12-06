import { GoogleGenAI, Type } from "@google/genai";
import { ModeId, Message, SessionSummary } from "../types";
import { INITIAL_GREETINGS, MODE_SYSTEM_INSTRUCTIONS, BASE_SYSTEM_PROMPT, GROUNDING_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT, MODES, LANGUAGES } from "../constants";

// API Keys provided by user
const GEMINI_API_KEY = "AIzaSyB3NgX8BGyKACVh0C9wki5wYE8SdfEOpms";
const SARVAM_API_KEY = "sk_0zbfoaz6_M59a8OoChTKho9udapiFph97";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const getLanguageName = (code: string) => {
  return LANGUAGES.find(l => l.code === code)?.nativeName || "English";
};

// Helper to generate UUIDs safely
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper to clean JSON strings from Markdown code blocks
const cleanJSON = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned;
};

// --- Gemini: Reflection Engine ---

export const startSession = async (mode: ModeId, languageCode: string): Promise<{ id: string; greeting: string }> => {
  const baseGreeting = INITIAL_GREETINGS[mode] || "Namaste. I am here.";
  
  if (languageCode === 'en-IN') {
    return {
      id: generateUUID(),
      greeting: baseGreeting,
    };
  }

  // If regional language, translate the greeting
  try {
    const langName = getLanguageName(languageCode);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: 'user', parts: [{ text: `Translate this greeting to ${langName} in a natural, warm tone appropriate for the "${mode}" persona. Output ONLY the translated text.\n\nGreeting: "${baseGreeting}"` }] }
      ]
    });
    return {
      id: generateUUID(),
      greeting: response.text?.trim() || baseGreeting,
    };
  } catch (e) {
    console.error("Greeting translation failed", e);
    return { id: generateUUID(), greeting: baseGreeting };
  }
};

export const sendMessage = async (
  history: Message[],
  userText: string,
  mode: ModeId,
  languageCode: string
): Promise<{ replyText: string; emotionalTone: string }> => {
  try {
    const modelId = "gemini-2.5-flash";
    const languageName = getLanguageName(languageCode);
    
    const systemInstruction = `${BASE_SYSTEM_PROMPT}
    \nCurrent Mode: ${mode.toUpperCase()}
    \nTarget Language: ${languageName}
    \nIMPORTANT: Respond ONLY in ${languageName} (using the native script).
    \n${MODE_SYSTEM_INSTRUCTIONS[mode]}`;
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: userText }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: { type: Type.STRING },
            emotionalTone: { type: Type.STRING },
          },
          required: ["replyText", "emotionalTone"],
        },
      }
    });

    const cleanText = cleanJSON(response.text || "{}");
    const json = JSON.parse(cleanText);
    
    return {
      replyText: json.replyText || "...",
      emotionalTone: json.emotionalTone || "neutral"
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      replyText: "...",
      emotionalTone: "neutral"
    };
  }
};

export const getGroundingExercise = async (mode: ModeId, languageCode: string): Promise<string> => {
  try {
    const modelId = "gemini-2.5-flash";
    const modeDesc = MODES.find(m => m.id === mode)?.description || "";
    const languageName = getLanguageName(languageCode);

    const prompt = GROUNDING_SYSTEM_PROMPT
      .replace('{{MODE}}', mode.toUpperCase())
      .replace('{{MODE_DESC}}', modeDesc)
      .replace('{{LANGUAGE}}', languageName);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: "Please give me a short grounding exercise." }] }
      ],
      config: {
        systemInstruction: prompt,
      }
    });

    return response.text?.trim() || "Breathe in... Breathe out...";
  } catch (error) {
    console.error("Gemini Grounding Error:", error);
    return "Close your eyes. Take a deep breath. Inhale peace. Exhale tension.";
  }
};

export const generateSessionSummary = async (messages: Message[], languageCode: string): Promise<SessionSummary> => {
  try {
    const modelId = "gemini-2.5-flash";
    const languageName = getLanguageName(languageCode);
    const transcript = messages.map(m => `${m.role}: ${m.text}`).join('\n');
    
    const prompt = SUMMARY_SYSTEM_PROMPT.replace('{{LANGUAGE}}', languageName);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: `Conversation Transcript:\n${transcript}` }] }
      ],
      config: {
        systemInstruction: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryText: { type: Type.STRING },
            keyThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
            reflectionQuestion: { type: Type.STRING },
          },
          required: ["summaryText", "keyThemes", "reflectionQuestion"],
        }
      }
    });

    const cleanText = cleanJSON(response.text || "{}");
    const json = JSON.parse(cleanText);

    return json as SessionSummary;
  } catch (error) {
    console.error("Summary Generation Error:", error);
    return {
      summaryText: "We talked about your feelings today.",
      keyThemes: ["Reflection"],
      reflectionQuestion: "How do you feel now?"
    };
  }
};

// --- Sarvam: Speech Services ---

export const transcribeAudio = async (audioBlob: Blob, languageCode: string = "hi-IN"): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', 'saaras:v1');
    formData.append('language_code', languageCode);

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Sarvam STT failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.transcript || "";
  } catch (error) {
    console.error("Sarvam STT Error:", error);
    return "";
  }
};

export const synthesizeSpeech = async (text: string, languageCode: string): Promise<string | null> => {
  try {
    const targetCode = languageCode; 
    
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetCode,
        speaker: "meera", 
        pitch: 0,
        pace: 0.90, // Slightly slower for reflective tone
        loudness: 1.5,
        speech_sample_rate: 16000, // Better quality
        enable_preprocessing: true,
        model: "bulbul:v1"
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Sarvam TTS Error Body:", errText);
        throw new Error(`Sarvam TTS failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.audios && data.audios.length > 0) {
      const base64Audio = data.audios[0];
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("Sarvam TTS Error:", error);
    return null;
  }
};
