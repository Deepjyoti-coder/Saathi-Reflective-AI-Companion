import React from 'react';
import { Message } from '../types';
import { User, Sparkles } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  modeColor: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, modeColor }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-stone-300 text-stone-600' : `${modeColor} shadow-sm`
        }`}>
          {isUser ? <User size={16} /> : <Sparkles size={16} />}
        </div>

        {/* Bubble */}
        <div className={`
          px-5 py-3.5 rounded-2xl text-base leading-relaxed shadow-sm
          ${isUser 
            ? 'bg-white text-stone-800 rounded-tr-none border border-stone-100' 
            : 'bg-white/80 backdrop-blur-sm text-stone-800 rounded-tl-none border border-stone-200 serif text-lg'}
        `}>
          {message.text}
          {/* Audio player placeholder if needed */}
          {message.audioUrl && (
             <div className="mt-2 text-xs text-stone-400 flex items-center gap-1">
               <span>🔊 Audio played</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
