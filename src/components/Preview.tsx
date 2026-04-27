import React, { useRef, useEffect } from 'react';
import { Scene, Character, DialogueLine } from '../types';
import { motion } from 'motion/react';
import { getAdaptiveColor, getContrastText } from '../utils/colors';

interface PreviewProps {
  scene: Scene;
  characters: Character[];
  isDarkMode: boolean;
  activeLineId: string | null;
}

export default function Preview({ scene, characters, isDarkMode, activeLineId }: PreviewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeLineText = scene.lines.find(l => l.id === activeLineId)?.text;

  useEffect(() => {
    if (!activeLineId) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current;
      const el = lineRefs.current[activeLineId];

      if (container && el) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        const margin = 100; // Visual margin logic

        let scrollAmount = 0;
        if (elRect.top < containerRect.top + margin) {
          scrollAmount = elRect.top - containerRect.top - margin;
        } else if (elRect.bottom > containerRect.bottom - margin) {
          scrollAmount = elRect.bottom - containerRect.bottom + margin;
        }

        if (scrollAmount !== 0) {
          container.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
          });
        }
      }
    }, 150);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeLineId, activeLineText, scene.lines.length]);

  const isHeader = (text: string) => {
    const t = text.trim();
    return t.startsWith('[') || t.startsWith('INT.') || t.startsWith('EXT.');
  };

  return (
    <div ref={scrollContainerRef} className="flex-1 bg-[#FAFAF8] dark:bg-[#303030] border-l border-stone-100 dark:border-white/5 overflow-y-auto no-scrollbar transition-colors duration-200">
      <div className="max-w-md mx-auto px-6 py-16 space-y-6 flex flex-col">
        {scene.lines.map((line, index) => {
          if (!line.text.trim()) return null;

          const header = isHeader(line.text);
          
          let displayText = line.text;
          if (header && line.text.trim().startsWith('[')) {
            displayText = line.text.trim().replace(/^\[|\]$/g, '');
          }
          
          if (header) {
            return (
              <div 
                key={line.id} 
                className={`py-6 text-center transition-all duration-300 ${activeLineId === line.id ? 'brightness-105' : 'brightness-100'}`}
                ref={(el) => (lineRefs.current[line.id] = el)}
              >
                <span className="text-sm font-serif italic text-stone-400 dark:text-zinc-500 tracking-wider">
                  {displayText}
                </span>
              </div>
            );
          }

          const char = characters.find(c => c.id === line.characterId);
          const prevLine = index > 0 ? scene.lines[index - 1] : null;
          const isSameSpeaker = prevLine && !isHeader(prevLine.text) && prevLine.characterId === line.characterId;
          const isMe = line.characterId === characters[0].id;

          const isActive = activeLineId === line.id;

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={line.id}
              ref={(el: HTMLDivElement | null) => (lineRefs.current[line.id] = el)}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSameSpeaker ? '-mt-4' : 'mt-2'}`}
            >
              {!isSameSpeaker && (
                <span className={`text-[11px] font-mono tracking-widest text-stone-400 dark:text-zinc-500 mb-1 px-2 transition-opacity ${isActive ? 'opacity-100' : 'opacity-90'}`}>
                  {char?.name}
                </span>
              )}
              <div
                className={`max-w-[72%] px-6 py-4 rounded-xl text-sm leading-relaxed transition-all duration-300 ring-1 ${
                  isMe ? 'rounded-tr-[4px]' : 'rounded-tl-[4px]'
                } ${isActive ? 'ring-black/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] brightness-105 dark:ring-white/15 scale-[1.002]' : 'ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] brightness-100 dark:ring-white/5 scale-100'}`}
                style={{ 
                  backgroundColor: char ? getAdaptiveColor(char.color, isDarkMode) : '#000000',
                  color: char ? getContrastText(getAdaptiveColor(char.color, isDarkMode)) : '#ffffff',
                }}
              >
                {line.text}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
