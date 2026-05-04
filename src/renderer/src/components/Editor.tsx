import React, { useRef, useEffect, useCallback } from 'react';
import { Scene, Character, DialogueBlock } from '../types';
import {
  getEditableDialogueBlocksForNonBranchingScene,
  isLongDialogueLine,
  isSceneDirectionLine,
} from '../../../shared/flatSceneLines';
import { getAdaptiveColor } from '../utils/colors';

interface EditorProps {
  scene: Scene;
  characters: Character[];
  activeSpeakerIndex: number;
  onUpdate: (blocks: DialogueBlock[]) => void;
  setActiveSpeakerIndex: (index: number) => void;
  isDarkMode: boolean;
  setActiveLineId: (id: string | null) => void;
}

export default function Editor({ scene, characters, activeSpeakerIndex, onUpdate, setActiveSpeakerIndex, isDarkMode, setActiveLineId }: EditorProps) {
  const lineRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const blocks = getEditableDialogueBlocksForNonBranchingScene(scene);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!blocks) {
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const nextSpeakerIndex = (activeSpeakerIndex + 1) % characters.length;
      setActiveSpeakerIndex(nextSpeakerIndex);

      const nextCharacterId = characters[nextSpeakerIndex]?.id;
      if (nextCharacterId && blocks[index].characterId !== nextCharacterId) {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...newBlocks[index], characterId: nextCharacterId };
        onUpdate(newBlocks);
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const el = lineRefs.current[index];
      const cursorPos = el?.selectionStart || 0;
      const currentText = blocks[index].text;
      
      const textBefore = currentText.substring(0, cursorPos);
      const textAfter = currentText.substring(cursorPos);

      const newBlocks = [...blocks];
      newBlocks[index] = { ...newBlocks[index], text: textBefore };
      
      const newLine: DialogueBlock = {
        id: `line-${Date.now()}`,
        type: 'dialogue',
        characterId: characters[activeSpeakerIndex].id,
        text: textAfter
      };
      newBlocks.splice(index + 1, 0, newLine);
      onUpdate(newBlocks);
      
      setTimeout(() => {
        const nextEl = lineRefs.current[index + 1];
        if (nextEl) {
          nextEl.focus();
          nextEl.setSelectionRange(0, 0);
        }
      }, 0);
    }

    if (e.key === 'Backspace' && index > 0) {
      const el = lineRefs.current[index];
      if (el && el.selectionStart === 0 && el.selectionEnd === 0) {
        e.preventDefault();
        const currentText = blocks[index].text;
        const prevText = blocks[index - 1].text;
        const newBlocks = [...blocks];
        
        // Merge texts
        newBlocks[index - 1] = { ...newBlocks[index - 1], text: prevText + currentText };
        // Remove current line
        newBlocks.splice(index, 1);
        onUpdate(newBlocks);
        
        // Focus previous line and restore cursor position
        setTimeout(() => {
          const prevEl = lineRefs.current[index - 1];
          if (prevEl) {
            prevEl.focus();
            prevEl.setSelectionRange(prevText.length, prevText.length);
          }
        }, 0);
      }
    }

    if (e.key === 'ArrowUp') {
      if (index > 0) {
        e.preventDefault();
        lineRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === 'ArrowDown') {
      if (index < blocks.length - 1) {
        e.preventDefault();
        lineRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleTextChange = (index: number, text: string) => {
    if (!blocks) {
      return;
    }

    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], text };
    onUpdate(newBlocks);
  };

  // Adjust textarea height
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  if (!blocks) {
    return (
      <div className="flex-1 overflow-y-auto bg-transparent transition-colors duration-200 flex flex-col items-center">
        <div className="w-full max-w-2xl px-12 py-16">
          <div className="rounded-lg border border-stone-200 bg-[#FAFAF8] px-4 py-3 text-sm text-stone-500 dark:border-white/10 dark:bg-[#303030] dark:text-zinc-400">
            Branching scene editing is not available yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent transition-colors duration-200 flex flex-col items-center">
      <div className="w-full max-w-2xl px-12 py-16 space-y-8">
        {blocks.map((line, index) => {
          const char = characters.find(c => c.id === line.characterId);
          const header = isSceneDirectionLine(line);
          const isLongLine = isLongDialogueLine(line);

          return (
            <div key={line.id} className="relative group/line transition-all">
              {/* Character Label */}
              {!header && (
                <div 
                  className="text-xs font-mono font-medium tracking-widest mb-1 pl-4 opacity-40 group-focus-within/line:opacity-100 transition-opacity"
                  style={{ color: char ? getAdaptiveColor(char.color, isDarkMode) : undefined }}
                >
                  {char?.name}
                </div>
              )}

              {/* Line Input */}
              <div className="flex gap-4">
                {!header && (
                  <div className="w-0.5 self-stretch rounded-full bg-stone-100 dark:bg-white/5 group-focus-within/line:bg-stone-200 dark:group-focus-within/line:bg-white/20 transition-colors" />
                )}
                <textarea
                  ref={el => {
                    lineRefs.current[index] = el;
                    autoResize(el);
                  }}
                  value={line.text}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={() => setActiveLineId(line.id)}
                  onBlur={() => setActiveLineId(null)}
                  placeholder={header ? "SCENE HEADER..." : "Dialog..."}
                  rows={1}
                  className={`flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 resize-none transition-colors select-text ${
                    header ? 'font-serif text-center italic text-stone-400 dark:text-zinc-500 text-sm tracking-wider uppercase' : 'font-sans text-base leading-relaxed'
                  } ${
                    isLongLine ? 'text-stone-500 dark:text-zinc-400' : 'text-stone-900 dark:text-zinc-200 border-b border-transparent focus:border-stone-50 dark:focus:border-white/5'
                  }`}
                />
              </div>

              {/* Subtle Long Line Indicator */}
              {isLongLine && (
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-stone-200 dark:bg-white/10 animate-pulse" title="Consider breaking this line" />
              )}
            </div>
          );
        })}
        {/* Placeholder for clicking at the end */}
        <div className="h-64" onClick={() => lineRefs.current[blocks.length - 1]?.focus()} />
      </div>
    </div>
  );
}
