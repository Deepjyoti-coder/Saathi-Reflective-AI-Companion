import React, { useState, useEffect, useRef } from 'react';
import { Message, SessionState, ModeId, SessionSummary } from './types';
import { MODES, LANGUAGES } from './constants';
import { ModeSelector } from './components/ModeSelector';
import { LanguageSelector } from './components/LanguageSelector';
import { ChatMessage } from './components/ChatMessage';
import { VoiceInput } from './components/VoiceInput';
import { startSession, sendMessage, transcribeAudio, synthesizeSpeech, getGroundingExercise, generateSessionSummary } from './services/aiService';
import { Send, Menu, X, RotateCcw, Wind, Download, Home } from 'lucide-react';

// Helper for generating IDs if crypto.randomUUID is not available
const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function App() {
  // --- State ---
  const [hasStarted, setHasStarted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrlToPlay, setAudioUrlToPlay] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [session, setSession] = useState<SessionState>({
    isActive: false,
    mode: 'yogi',
    language: 'en-IN',
    messages: []
  });

  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session.messages]);

  useEffect(() => {
    if (audioUrlToPlay && audioRef.current) {
      audioRef.current.src = audioUrlToPlay;
      audioRef.current.play().catch(e => console.error("Audio playback failed", e));
    }
  }, [audioUrlToPlay]);

  // --- Handlers ---
  const handleStartSession = async (modeId: ModeId) => {
    setIsProcessing(true);
    try {
      const { greeting } = await startSession(modeId, selectedLanguage);
      setSession({
        isActive: true,
        mode: modeId,
        language: selectedLanguage,
        messages: [{
          id: uuid(),
          role: 'ai',
          text: greeting,
          timestamp: new Date()
        }]
      });
      setHasStarted(true);
    } catch (error) {
      console.error("Failed to start session", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processResponse = async (userText: string) => {
    const currentMessages = [...session.messages, {
        id: uuid(),
        role: 'user' as const,
        text: userText,
        timestamp: new Date()
    }];

    setSession(prev => ({
      ...prev,
      messages: currentMessages
    }));

    try {
      const { replyText, emotionalTone } = await sendMessage(currentMessages, userText, session.mode, session.language);
      
      const audioUrl = await synthesizeSpeech(replyText, session.language);
      
      if (audioUrl) {
          setAudioUrlToPlay(audioUrl);
      }

      const aiMsg: Message = {
        id: uuid(),
        role: 'ai',
        text: replyText,
        timestamp: new Date(),
        emotionalTone: emotionalTone,
        audioUrl: audioUrl || undefined
      };

      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, aiMsg]
      }));
    } catch (error) {
      console.error("Processing failed", error);
    } finally {
      setIsProcessing(false);
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText("");
    setIsProcessing(true);
    await processResponse(text);
  };

  const handleVoiceCapture = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const transcribedText = await transcribeAudio(audioBlob, session.language);
      if (!transcribedText) {
          setIsProcessing(false);
          return;
      }
      await processResponse(transcribedText);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const handleGrounding = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const exerciseText = await getGroundingExercise(session.mode, session.language);
      const audioUrl = await synthesizeSpeech(exerciseText, session.language);

      if (audioUrl) {
        setAudioUrlToPlay(audioUrl);
      }

      const aiMsg: Message = {
        id: uuid(),
        role: 'ai',
        text: exerciseText,
        timestamp: new Date(),
        emotionalTone: 'calm',
        audioUrl: audioUrl || undefined
      };

      setSession(prev => ({
        ...prev,
        messages: [...prev.messages, aiMsg]
      }));
    } catch (error) {
      console.error("Grounding failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndSession = async () => {
    if (session.messages.length < 2) {
      resetSession();
      return;
    }
    
    setIsSidebarOpen(false);
    setIsSummarizing(true);
    
    try {
      const summary = await generateSessionSummary(session.messages, session.language);
      setSession(prev => ({ ...prev, isActive: false, summary }));
    } catch (e) {
      console.error("Summary failed", e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!session.summary) return;

    const dateStr = new Date().toLocaleDateString();
    const content = `Saathi Reflection Summary
Date: ${dateStr}
---------------------------

SUMMARY
${session.summary.summaryText}

KEY THEMES
${session.summary.keyThemes.map(t => `- ${t}`).join('\n')}

REFLECTION QUESTION
${session.summary.reflectionQuestion}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saathi-reflection-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetSession = () => {
    setHasStarted(false);
    setSession({ 
      isActive: false, 
      mode: 'yogi', 
      language: selectedLanguage, 
      messages: [] 
    });
    setIsSidebarOpen(false);
    setAudioUrlToPlay(null);
    setIsSummarizing(false);
  };

  // --- Render ---
  
  // 1. Start Screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 text-stone-800 p-4">
        <div className="text-center mb-8 animate-fade-in-up">
           <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
           </div>
           <h1 className="text-5xl font-serif text-stone-800 mb-4">Saathi</h1>
           <p className="text-xl text-stone-500 max-w-md mx-auto">A mirror for your mind.</p>
        </div>
        
        {isProcessing ? (
           <div className="text-stone-400 flex flex-col items-center">
             <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mb-2"></div>
             Preparing sanctuary...
           </div>
        ) : (
          <>
            <LanguageSelector selectedCode={selectedLanguage} onSelect={setSelectedLanguage} />
            <ModeSelector onSelect={handleStartSession} />
          </>
        )}
      </div>
    );
  }

  const currentMode = MODES.find(m => m.id === session.mode) || MODES[0];

  // 2. Summary Screen (Post-Session)
  if (!session.isActive && session.summary) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100">
          <div className={`p-8 ${currentMode.color}`}>
            <h2 className="text-3xl font-serif mb-2">Reflections</h2>
            <div className="opacity-80 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="prose prose-stone max-w-none">
              <h3 className="font-serif text-xl text-stone-800 mb-2">Summary</h3>
              <p className="text-stone-600 leading-relaxed text-lg">
                {session.summary.summaryText}
              </p>
            </div>

            <div>
              <h3 className="font-serif text-xl text-stone-800 mb-3">Key Themes</h3>
              <div className="flex flex-wrap gap-2">
                {session.summary.keyThemes.map((theme, i) => (
                  <span key={i} className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-sm">
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
              <h3 className="font-serif text-xl text-orange-900 mb-2">A Question for You</h3>
              <p className="text-orange-800 italic">
                "{session.summary.reflectionQuestion}"
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-stone-100">
              <button onClick={resetSession} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors">
                <Home size={18} />
                <span>Home</span>
              </button>
              
              <button 
                onClick={handleDownloadSummary}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors"
              >
                <Download size={18} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Loading Summary Screen
  if (isSummarizing) {
    return (
       <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-orange-400 rounded-full animate-spin mb-4"></div>
          <p className="font-serif text-xl text-stone-600 animate-pulse">Gathering reflections...</p>
       </div>
    );
  }

  // 4. Main Chat Interface
  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      
      {/* Hidden Audio Player */}
      <audio ref={audioRef} className="hidden" />

      {/* Sidebar (Desktop) */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-stone-200 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif text-stone-800">Saathi</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-stone-400">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1">
             <div className="text-xs font-semibold uppercase text-stone-400 tracking-wider mb-4">Current Session</div>
             <div className={`p-4 rounded-xl ${currentMode.color} mb-6`}>
                <div className="font-serif text-lg font-medium mb-1">{currentMode.name}</div>
                <div className="text-xs opacity-80">{currentMode.description}</div>
             </div>
             <div className="px-1 text-sm text-stone-500">
               Speaking: <span className="font-medium text-stone-700">{LANGUAGES.find(l => l.code === session.language)?.name}</span>
             </div>
          </div>

          <button onClick={handleEndSession} className="flex items-center gap-3 text-stone-500 hover:text-orange-600 transition-colors py-3 group">
             <RotateCcw size={18} className="group-hover:-rotate-90 transition-transform"/>
             <span>End & Summarize</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-white border-b border-stone-100 flex items-center justify-between px-4 shrink-0 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="text-stone-600">
             <Menu size={24} />
          </button>
          <span className="font-serif text-xl text-stone-800">Saathi</span>
          <div className="w-6"></div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-8 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {session.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} modeColor={currentMode.color} />
            ))}
            {isProcessing && (
              <div className="flex w-full mb-6 justify-start animate-pulse">
                 <div className="flex items-end gap-3">
                    <div className={`w-8 h-8 rounded-full ${currentMode.color} flex items-center justify-center`}>...</div>
                    <div className="text-stone-400 text-sm">Reflecting...</div>
                 </div>
              </div>
            )}
            <div ref={scrollBottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 bg-white/80 backdrop-blur-md border-t border-stone-200 px-4 py-4 md:px-8 md:py-6">
           <div className="max-w-3xl mx-auto flex items-end gap-3">
              
              {/* Grounding Button */}
              <button
                 onClick={handleGrounding}
                 disabled={isProcessing}
                 className="mb-1 p-3 rounded-full text-stone-500 hover:bg-stone-100 hover:text-teal-600 transition-colors"
                 title="Take a moment to pause"
              >
                <Wind size={20} />
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your thought, or use voice..."
                  className="w-full bg-stone-100 border-0 rounded-2xl px-5 py-4 text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-200 resize-none max-h-32 min-h-[56px]"
                  rows={1}
                  disabled={isProcessing}
                />
              </div>

              {inputText.trim() ? (
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing}
                  className="w-14 h-14 rounded-full bg-stone-800 text-white flex items-center justify-center hover:bg-stone-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} className="ml-0.5" />
                </button>
              ) : (
                <VoiceInput 
                   onAudioCaptured={handleVoiceCapture} 
                   disabled={isProcessing}
                   isProcessing={isProcessing} 
                />
              )}
           </div>
        </div>

      </div>
    </div>
  );
}