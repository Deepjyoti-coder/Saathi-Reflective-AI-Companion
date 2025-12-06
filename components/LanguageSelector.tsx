import React from 'react';
import { LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedCode, onSelect }) => {
  return (
    <div className="w-full max-w-xs mx-auto mb-8">
      <label className="block text-sm font-medium text-stone-500 mb-2 text-center">
        Select Language / भाषा चुनें
      </label>
      <div className="relative">
        <select
          value={selectedCode}
          onChange={(e) => onSelect(e.target.value)}
          className="block w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-800 focus:ring-2 focus:ring-orange-200 focus:border-orange-200 appearance-none text-center font-medium cursor-pointer shadow-sm hover:border-orange-200 transition-colors"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
          </svg>
        </div>
      </div>
    </div>
  );
};