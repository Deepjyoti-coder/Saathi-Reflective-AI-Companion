# Saathi: Implementation Plan & Architecture

This document outlines the full stack design for **Saathi**, a reflective AI companion.

## 1. High-Level Architecture

The system follows a standard Client-Server architecture with specialized AI services.

**Components:**
1.  **Frontend (React/PWA):** Handles UI, audio recording (MediaRecorder API), and playback.
2.  **Backend (FastAPI):** Orchestrates logic, manages session state, and secures API keys.
3.  **Database (PostgreSQL):** Persists user history, sessions, and summaries.
4.  **AI Layer:**
    *   **Sarvam AI:** Speech-to-Text (STT) for Indian languages + Text-to-Speech (TTS).
    *   **Google Gemini:** The "Brain" (Reflection Engine, NLU, Generation).

**Sequence Diagram (Voice Turn):**

```text
User (Voice Input)
   |
   v
[Frontend] --(Audio Blob)--> [Backend API]
                                   |
                                   v
                             [Sarvam STT] --(Text)--> [Backend]
                                                           |
                                                           v
                             [DB] <--(Context/History)-- [Gemini Engine]
                                                           |
                                                           v
                             [Sarvam TTS] <--(Response)-- [Gemini Response]
                                   |
                                   v
[Frontend] <--(Audio + Text)-- [Backend API]
   |
   v
User (Hears Audio + Sees Text)
```

---

## 2. Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferred_language VARCHAR(10) DEFAULT 'en-IN'
);

-- Profiles for different Saathi personalities (Yogi, Elder, etc.)
CREATE TABLE mode_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- 'yogi', 'elder', 'sufi'
    system_prompt_template TEXT NOT NULL,
    voice_preset_id VARCHAR(50) -- ID mapping for Sarvam TTS voice
);

-- Chat sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    mode_id INTEGER REFERENCES mode_profiles(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Messages (User and AI)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    sender_type VARCHAR(20) CHECK (sender_type IN ('user', 'ai')),
    content_text TEXT NOT NULL,
    content_audio_url TEXT, -- Path to stored audio file if voice was used
    emotional_tag VARCHAR(50), -- e.g., 'anxious', 'calm' (detected by Gemini)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Summaries (Generated at end of session)
CREATE TABLE session_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    summary_text TEXT NOT NULL,
    key_themes TEXT[], -- Array of themes extracted
    suggested_reflection_q TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Backend API Design (FastAPI)

**Base URL:** `/api/v1`

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/guest` | Create anonymous user | `{}` | `{ "user_id": "uuid", "token": "..." }` |
| `POST` | `/sessions/start` | Start new conversation | `{ "mode": "yogi", "language": "hi" }` | `{ "session_id": "uuid", "welcome_message": "..." }` |
| `POST` | `/sessions/{id}/message/text` | Send text message | `{ "text": "I feel sad" }` | `{ "reply_text": "...", "audio_url": null }` |
| `POST` | `/sessions/{id}/message/voice` | Send audio blob | `FormData: file=@audio.wav` | `{ "user_text": "...", "reply_text": "...", "reply_audio_url": "url" }` |
| `POST` | `/sessions/{id}/end` | End & Summarize | `{}` | `{ "summary": "...", "insight": "..." }` |

---

## 4. Gemini Prompting Strategy

**A. Core Reflection Prompt (System Instruction):**

```text
You are Saathi, a reflective companion.
Current Mode: {{MODE_NAME}} ({{MODE_DESCRIPTION}})
User Language: {{LANGUAGE}}

Core Principles:
1. Mirror emotions first. "It sounds like you are feeling..."
2. Ask 1 deep, open-ended question. Never more than 2.
3. Be concise. Avoid lecturing.
4. Use metaphors from nature or {{MODE_STYLE}} wisdom.
5. Do NOT give medical advice. If user mentions self-harm, gently redirect to professional help.

Context from previous turns:
{{LAST_3_TURNS}}

User just said: "{{USER_INPUT}}"

Respond in {{LANGUAGE}}. Format: JSON { "emotional_tone": "...", "reply_text": "..." }
```

**B. Emotional Tone Detection (Chain of Thought):**
*Integrated into the JSON response above to save latency.*

**C. Mode Adaptations:**
*   **Yogi:** Focus on breath, present moment, "witnessing" thoughts.
*   **Elder:** Warm, uses phrases like "beta" (child) or "my dear", references seasons of life.
*   **Sufi:** Poetic, references the "heart", "the journey", "the beloved", mystical paradoxes.

**D. Session Summary Prompt:**

```text
Analyze the following conversation transcript.
Generate a summary in the second person ("You talked about...").
Identify 1 key recurring emotional theme.
Leave the user with one gentle question to carry forward.
Keep it under 150 words.
```

---

## 5. Sarvam Integration (Python Stub)

```python
import requests
import os

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

def transcribe_audio_with_sarvam(audio_bytes: bytes, language_code: str = "hi-IN") -> str:
    """Sends audio to Sarvam STT"""
    url = "https://api.sarvam.ai/speech-to-text" # Placeholder URL
    files = {'file': ('audio.wav', audio_bytes, 'audio/wav')}
    data = {'language_code': language_code, 'model': 'saaras'}
    headers = {'API-KEY': SARVAM_API_KEY}
    
    response = requests.post(url, headers=headers, files=files, data=data)
    return response.json().get("transcript", "")

def synthesize_speech_with_sarvam(text: str, language_code: str = "hi-IN", speaker: str = "meera") -> bytes:
    """Sends text to Sarvam TTS"""
    url = "https://api.sarvam.ai/text-to-speech"
    payload = {
        "inputs": [text],
        "target_language_code": language_code,
        "speaker": speaker
    }
    headers = {'API-KEY': SARVAM_API_KEY, 'Content-Type': 'application/json'}
    
    response = requests.post(url, headers=headers, json=payload)
    # Returns raw audio bytes (wav/mp3)
    return response.content 
```

---

## 6. Backend Code Skeleton (FastAPI `main.py`)

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
# import db_service, gemini_service, sarvam_service

app = FastAPI()

class StartSessionRequest(BaseModel):
    mode: str
    language: str

@app.post("/api/sessions/start")
async def start_session(req: StartSessionRequest):
    # 1. Create session in DB
    # 2. Get initial greeting from Gemini based on Mode
    # 3. Return session_id
    return {"session_id": "123", "message": "Namaste. I am here to listen."}

@app.post("/api/sessions/{session_id}/message/voice")
async def voice_message(session_id: str, file: UploadFile = File(...)):
    audio_bytes = await file.read()
    
    # 1. STT
    # user_text = sarvam_service.transcribe(audio_bytes)
    user_text = "I feel anxious about my job." # Mock
    
    # 2. Reflection Engine
    # context = db_service.get_history(session_id)
    # ai_response_json = gemini_service.generate_reflection(user_text, context)
    ai_text = "Anxiety often comes when we look too far ahead. What is one thing purely in your control right now?"
    
    # 3. TTS
    # audio_out = sarvam_service.synthesize(ai_text)
    
    # 4. Save to DB
    
    return {
        "user_text": user_text,
        "reply_text": ai_text,
        "reply_audio_url": "/static/audio/response_123.wav" 
    }
```

---

## 9. Roadmap

*   **Journaling Mode:** Save text-only reflections without AI response.
*   **Weekly Insights:** Aggregate themes (e.g., "This week you felt 'stuck' 3 times").
*   **Mood Visualization:** A "Mandala" that changes colors based on session emotions.
*   **Offline Support:** PWA capabilities for reading past summaries offline.
*   **Custom Voices:** Clone a trusted voice (with permission) for the 'Elder' persona.
