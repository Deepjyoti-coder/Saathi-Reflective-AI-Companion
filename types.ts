export type Role = 'user' | 'ai';

export type ModeId = 'yogi' | 'elder' | 'teacher' | 'poet' | 'sufi' | 'monk';

export interface Mode {
  id: ModeId;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  emotionalTone?: string;
  audioUrl?: string; // If this message has associated audio
}

export interface SessionSummary {
  summaryText: string;
  keyThemes: string[];
  reflectionQuestion: string;
}

export interface SessionState {
  isActive: boolean;
  mode: ModeId;
  language: string;
  messages: Message[];
  summary?: SessionSummary;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}