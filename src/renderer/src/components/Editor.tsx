import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Character, DialogueBlock, Scene } from '../types';
import {
  addSceneSection,
  deleteSceneSection,
  getDialogueBlockPositions,
  getSectionDeleteBlockReason,
  mergeDialogueBlockWithPrevious,
  renameSceneSection,
  splitDialogueBlock,
  updateDialogueBlockSpeaker,
  updateDialogueBlockText,
  updateSceneSectionContinuation,
} from '../../../shared/sectionEditor';
import {
  isLongDialogueLine,
  isSceneDirectionLine,
} from '../../../shared/flatSceneLines';
import { getAdaptiveColor } from '../utils/colors';

interface EditorProps {
  scene: Scene;
  characters: Character[];
  activeSpeakerIndex: number;
  onUpdateScene: (scene: Scene) => void;
  setActiveSpeakerIndex: (index: number) => void;
  isDarkMode: boolean;
  setActiveLineId: (id: string | null) => void;
}

export default function Editor({
  scene,
  characters,
  activeSpeakerIndex,
  onUpdateScene,
  setActiveSpeakerIndex,
  isDarkMode,
  setActiveLineId,
}: EditorProps) {
  const lineRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [sectionMessage, setSectionMessage] = useState<string | null>(null);
  const dialoguePositions = useMemo(() => getDialogueBlockPositions(scene), [scene]);
  const visibleDialoguePositions = useMemo(
    () =>
      dialoguePositions.filter(
        (position) => !collapsedSectionIds.has(position.sectionId)
      ),
    [collapsedSectionIds, dialoguePositions]
  );

  const handleKeyDown = (
    event: React.KeyboardEvent,
    sectionId: string,
    line: DialogueBlock
  ) => {
    const positionIndex = visibleDialoguePositions.findIndex(
      (position) => position.blockId === line.id
    );

    if (event.key === 'Tab') {
      event.preventDefault();

      if (characters.length === 0) {
        return;
      }

      const nextSpeakerIndex = (activeSpeakerIndex + 1) % characters.length;
      const nextCharacterId = characters[nextSpeakerIndex]?.id;

      setActiveSpeakerIndex(nextSpeakerIndex);

      if (nextCharacterId && line.characterId !== nextCharacterId) {
        onUpdateScene(
          updateDialogueBlockSpeaker(scene, sectionId, line.id, nextCharacterId)
        );
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      const element = lineRefs.current[line.id];
      const cursorPosition = element?.selectionStart ?? 0;
      const nextCharacterId =
        characters[activeSpeakerIndex]?.id ?? characters[0]?.id ?? line.characterId;
      const result = splitDialogueBlock(
        scene,
        sectionId,
        line.id,
        cursorPosition,
        nextCharacterId
      );

      if (!result) {
        return;
      }

      onUpdateScene(result.scene);
      focusLine(result.newBlockId, 0);
    }

    if (event.key === 'Backspace') {
      const element = lineRefs.current[line.id];

      if (element && element.selectionStart === 0 && element.selectionEnd === 0) {
        const result = mergeDialogueBlockWithPrevious(scene, sectionId, line.id);

        if (!result) {
          return;
        }

        event.preventDefault();
        onUpdateScene(result.scene);
        focusLine(result.focusBlockId, result.cursorPosition);
      }
    }

    if (event.key === 'ArrowUp' && positionIndex > 0) {
      event.preventDefault();
      focusLine(visibleDialoguePositions[positionIndex - 1].blockId);
    }

    if (
      event.key === 'ArrowDown' &&
      positionIndex >= 0 &&
      positionIndex < visibleDialoguePositions.length - 1
    ) {
      event.preventDefault();
      focusLine(visibleDialoguePositions[positionIndex + 1].blockId);
    }
  };

  const handleTextChange = (sectionId: string, line: DialogueBlock, text: string) => {
    onUpdateScene(updateDialogueBlockText(scene, sectionId, line.id, text));
  };

  const handleAddSection = () => {
    const characterId = characters[activeSpeakerIndex]?.id ?? characters[0]?.id;

    if (!characterId) {
      return;
    }

    const nextScene = addSceneSection(scene, characterId);
    const newSection = nextScene.sections[nextScene.sections.length - 1];
    const firstDialogue = newSection.blocks.find((block) => block.type === 'dialogue');

    setSectionMessage(null);
    onUpdateScene(nextScene);

    if (firstDialogue) {
      focusLine(firstDialogue.id, 0);
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    const result = deleteSceneSection(scene, sectionId);

    if (result.error) {
      setSectionMessage(result.error);
      return;
    }

    setSectionMessage(null);
    onUpdateScene(result.scene);
  };

  const handleContinuationChange = (sectionId: string, value: string) => {
    const result = updateSceneSectionContinuation(
      scene,
      sectionId,
      value === '' ? null : value
    );

    if (result.error) {
      setSectionMessage(result.error);
      return;
    }

    setSectionMessage(null);
    onUpdateScene(result.scene);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds((previous) => {
      const next = new Set(previous);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  };

  const autoResize = (element: HTMLTextAreaElement | null) => {
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    }
  };

  const focusLine = (blockId: string, cursorPosition?: number) => {
    window.setTimeout(() => {
      const element = lineRefs.current[blockId];

      if (!element) {
        return;
      }

      const position = cursorPosition ?? element.selectionStart;
      element.focus();
      element.setSelectionRange(position, position);
    }, 0);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent transition-colors duration-200 flex flex-col items-center">
      <div className="w-full max-w-2xl px-12 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-widest">
            Sections
          </div>
          <button
            onClick={handleAddSection}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
          >
            <Plus size={13} />
            Add Section
          </button>
        </div>

        {sectionMessage && (
          <div className="rounded-md border border-stone-200 bg-[#FAFAF8] px-3 py-2 text-xs text-stone-500 dark:border-white/10 dark:bg-[#303030] dark:text-zinc-400">
            {sectionMessage}
          </div>
        )}

        {scene.sections.map((section, sectionIndex) => {
          const isCollapsed = collapsedSectionIds.has(section.id);
          const deleteBlockReason = getSectionDeleteBlockReason(scene, section.id);

          return (
            <section key={section.id} className="space-y-5">
              <div className="group flex items-center gap-3 border-b border-stone-200 pb-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="rounded p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                  title={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-widest">
                    Section {sectionIndex + 1}
                  </div>
                  <input
                    value={section.name}
                    onChange={(event) =>
                      onUpdateScene(
                        renameSceneSection(scene, section.id, event.target.value)
                      )
                    }
                    className="mt-1 w-full bg-transparent p-0 font-serif text-base italic text-[#1C1917] outline-none transition-colors dark:text-[#D6D3D1]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(section.id)}
                  className="rounded p-1 text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  title={deleteBlockReason ?? 'Delete section'}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {!isCollapsed && (
                <>
                  <div className="space-y-8">
                    {section.blocks.map((block) => {
                      if (block.type === 'choice') {
                        return (
                          <div
                            key={block.id}
                            className="rounded-lg border border-dashed border-stone-200 bg-[#FAFAF8]/70 px-4 py-3 text-sm text-stone-500 dark:border-white/10 dark:bg-[#303030]/70 dark:text-zinc-400"
                          >
                            <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                              Choice block
                            </div>
                            <div className="mt-2 space-y-1">
                              {block.options.length === 0 ? (
                                <div>No options yet.</div>
                              ) : (
                                block.options.map((option) => (
                                  <div key={option.id} className="truncate">
                                    {option.text || 'Untitled option'}
                                    {' -> '}
                                    {option.targetSectionId
                                      ? sectionNameForId(scene, option.targetSectionId)
                                      : 'Ends here'}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <DialogueLineEditor
                          key={block.id}
                          line={block}
                          sectionId={section.id}
                          characters={characters}
                          isDarkMode={isDarkMode}
                          lineRefs={lineRefs}
                          autoResize={autoResize}
                          onTextChange={handleTextChange}
                          onKeyDown={handleKeyDown}
                          setActiveLineId={setActiveLineId}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 text-[11px] font-mono uppercase tracking-widest text-stone-400 dark:border-white/5 dark:text-zinc-500">
                    <span>Continues to:</span>
                    <select
                      value={section.nextSectionId ?? ''}
                      onChange={(event) =>
                        handleContinuationChange(section.id, event.target.value)
                      }
                      className="rounded-md border border-stone-200 bg-[#FAFAF8] px-2 py-1 text-[11px] normal-case tracking-normal text-stone-600 outline-none transition-colors dark:border-white/10 dark:bg-[#303030] dark:text-zinc-300"
                    >
                      <option value="">Ends here</option>
                      {scene.sections
                        .filter((targetSection) => targetSection.id !== section.id)
                        .map((targetSection) => (
                          <option key={targetSection.id} value={targetSection.id}>
                            {targetSection.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
            </section>
          );
        })}

        <div
          className="h-64"
          onClick={() => {
            const lastPosition = dialoguePositions[dialoguePositions.length - 1];

            if (lastPosition) {
              focusLine(lastPosition.blockId);
            }
          }}
        />
      </div>
    </div>
  );
}

interface DialogueLineEditorProps {
  line: DialogueBlock;
  sectionId: string;
  characters: Character[];
  isDarkMode: boolean;
  lineRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  autoResize: (element: HTMLTextAreaElement | null) => void;
  onTextChange: (sectionId: string, line: DialogueBlock, text: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent,
    sectionId: string,
    line: DialogueBlock
  ) => void;
  setActiveLineId: (id: string | null) => void;
}

function DialogueLineEditor({
  line,
  sectionId,
  characters,
  isDarkMode,
  lineRefs,
  autoResize,
  onTextChange,
  onKeyDown,
  setActiveLineId,
}: DialogueLineEditorProps) {
  const character = characters.find((candidate) => candidate.id === line.characterId);
  const header = isSceneDirectionLine(line);
  const isLongLine = isLongDialogueLine(line);

  return (
    <div className="relative group/line transition-all">
      {!header && (
        <div
          className="text-xs font-mono font-medium tracking-widest mb-1 pl-4 opacity-40 group-focus-within/line:opacity-100 transition-opacity"
          style={{
            color: character ? getAdaptiveColor(character.color, isDarkMode) : undefined,
          }}
        >
          {character?.name}
        </div>
      )}

      <div className="flex gap-4">
        {!header && (
          <div className="w-0.5 self-stretch rounded-full bg-stone-100 dark:bg-white/5 group-focus-within/line:bg-stone-200 dark:group-focus-within/line:bg-white/20 transition-colors" />
        )}
        <textarea
          ref={(element) => {
            lineRefs.current[line.id] = element;
            autoResize(element);
          }}
          value={line.text}
          onChange={(event) => onTextChange(sectionId, line, event.target.value)}
          onKeyDown={(event) => onKeyDown(event, sectionId, line)}
          onFocus={() => setActiveLineId(line.id)}
          onBlur={() => setActiveLineId(null)}
          placeholder={header ? 'SCENE HEADER...' : 'Dialog...'}
          rows={1}
          className={`flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 resize-none transition-colors select-text ${
            header
              ? 'font-serif text-center italic text-stone-400 dark:text-zinc-500 text-sm tracking-wider uppercase'
              : 'font-sans text-base leading-relaxed'
          } ${
            isLongLine
              ? 'text-stone-500 dark:text-zinc-400'
              : 'text-stone-900 dark:text-zinc-200 border-b border-transparent focus:border-stone-50 dark:focus:border-white/5'
          }`}
        />
      </div>

      {isLongLine && (
        <div
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-stone-200 dark:bg-white/10 animate-pulse"
          title="Consider breaking this line"
        />
      )}
    </div>
  );
}

function sectionNameForId(scene: Scene, sectionId: string): string {
  return (
    scene.sections.find((section) => section.id === sectionId)?.name ??
    'Unknown section'
  );
}
