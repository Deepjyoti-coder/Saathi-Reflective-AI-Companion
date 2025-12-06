import React from 'react';
import { MODES } from '../constants';
import { ModeId } from '../types';
import { Feather, BookOpen, Mountain, Armchair, Flower } from 'lucide-react';

// Manual icon mapping since we can't dynamic import easily in this setup
const Icons: Record<string, React.FC<any>> = {
  'Lotus': Flower, // Using Flower as proxy for Lotus
  'Armchair': Armchair,
  'Feather': Feather,
  'BookOpen': BookOpen,
  'Mountain': Mountain,
};

interface ModeSelectorProps {
  onSelect: (modeId: ModeId) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelect }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-serif text-center text-stone-800 mb-2">Choose your Companion</h2>
      <p className="text-center text-stone-500 mb-10">Who would you like to reflect with today?</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODES.map((mode) => {
          const Icon = Icons[mode.icon] || Flower;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className="flex items-start p-5 bg-white border border-stone-200 rounded-xl hover:shadow-md hover:border-orange-200 transition-all text-left group"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4 ${mode.color} group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-serif text-xl text-stone-800 mb-1">{mode.name}</h3>
                <p className="text-sm text-stone-500 leading-snug">{mode.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
