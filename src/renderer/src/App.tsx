import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Download,
  FolderOpen,
  Moon,
  Plus,
  Save,
  SaveAll,
  Sun,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createBlankProject } from '../../shared/project';
import type { Character, DialogueLine, Scene, VicariousProject } from './types';
import Editor from './components/Editor';
import Preview from './components/Preview';
import { PALETTE_COLORS, getAdaptiveColor } from './utils/colors';

const RENDERER_PLACEHOLDER_APP_VERSION = '0.0.0';

const DEFAULT_CHARACTER_POOL: Character[] = [
  { id: '1', name: 'Character 1', color: PALETTE_COLORS[0] },
  { id: '2', name: 'Character 2', color: PALETTE_COLORS[3] },
  { id: '3', name: 'Character 3', color: PALETTE_COLORS[4] },
  { id: '4', name: 'Character 4', color: PALETTE_COLORS[5] },
];

function createInitialProject(): VicariousProject {
  const ids = [
    `project-${Date.now()}`,
    'scene-1',
    DEFAULT_CHARACTER_POOL[0].id,
    DEFAULT_CHARACTER_POOL[1].id,
    'initial-line',
  ];
  let index = 0;

  return createBlankProject({
    appVersion: RENDERER_PLACEHOLDER_APP_VERSION,
    generateId: () => ids[index++] ?? `id-${Date.now()}-${index}`,
  });
}

export default function App() {
  const [project, setProject] = useState<VicariousProject>(() => createInitialProject());
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const scenes = project.scenes;
  const currentSceneId = project.currentSceneId;

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleOutsideClick = () => setActiveColorPicker(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const currentScene = useMemo(
    () => scenes.find((scene) => scene.id === currentSceneId) || scenes[0],
    [scenes, currentSceneId]
  );

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setProjectStatus(null);
  }, []);

  const updateCurrentScene = useCallback(
    (updater: (scene: Scene) => Scene) => {
      setProject((previous) => ({
        ...previous,
        scenes: previous.scenes.map((scene) =>
          scene.id === previous.currentSceneId ? updater(scene) : scene
        ),
      }));
      markDirty();
    },
    [markDirty]
  );

  const handleSaveProject = useCallback(async (): Promise<boolean> => {
    setProjectError(null);

    try {
      const response = filePath
        ? await getDesktopApi().saveProject(project, filePath)
        : await getDesktopApi().saveProjectAs(project);

      if (!response) {
        return false;
      }

      setProject(response.project);
      setFilePath(response.filePath);
      setIsDirty(false);
      setProjectStatus(`Saved ${fileNameFromPath(response.filePath)}`);
      return true;
    } catch (error) {
      setProjectError(readErrorMessage(error));
      return false;
    }
  }, [filePath, project]);

  const handleSaveProjectAs = useCallback(async (): Promise<boolean> => {
    setProjectError(null);

    try {
      const response = await getDesktopApi().saveProjectAs(project);

      if (!response) {
        return false;
      }

      setProject(response.project);
      setFilePath(response.filePath);
      setIsDirty(false);
      setProjectStatus(`Saved ${fileNameFromPath(response.filePath)}`);
      return true;
    } catch (error) {
      setProjectError(readErrorMessage(error));
      return false;
    }
  }, [project]);

  const confirmProjectReplacement = useCallback(async (): Promise<boolean> => {
    if (!isDirty) {
      return true;
    }

    const response = await getDesktopApi().confirmUnsavedChanges();

    if (response === 'cancel') {
      return false;
    }

    if (response === 'discard') {
      return true;
    }

    return handleSaveProject();
  }, [handleSaveProject, isDirty]);

  const handleOpenProject = useCallback(async () => {
    setProjectError(null);

    try {
      const canReplaceProject = await confirmProjectReplacement();

      if (!canReplaceProject) {
        return;
      }

      const response = await getDesktopApi().openProject();

      if (!response) {
        return;
      }

      setProject(response.project);
      setFilePath(response.filePath);
      setIsDirty(false);
      setActiveSpeakerIndex(0);
      setActiveColorPicker(null);
      setCharacterToDelete(null);
      setActiveLineId(null);
      setProjectStatus(`Opened ${fileNameFromPath(response.filePath)}`);
    } catch (error) {
      setProjectError(readErrorMessage(error));
    }
  }, [confirmProjectReplacement]);

  const handleNewProject = useCallback(async () => {
    setProjectError(null);

    try {
      const canReplaceProject = await confirmProjectReplacement();

      if (!canReplaceProject) {
        return;
      }
    } catch (error) {
      setProjectError(readErrorMessage(error));
      return;
    }

    setProject(createInitialProject());
    setFilePath(null);
    setIsDirty(false);
    setActiveSpeakerIndex(0);
    setActiveColorPicker(null);
    setCharacterToDelete(null);
    setActiveLineId(null);
    setProjectStatus('Created new project');
  }, [confirmProjectReplacement]);

  const addScene = () => {
    const timestamp = Date.now();
    const newScene: Scene = {
      id: `scene-${timestamp}`,
      name: `Scene ${scenes.length + 1}`,
      characters: [DEFAULT_CHARACTER_POOL[0], DEFAULT_CHARACTER_POOL[1]],
      lines: [
        {
          id: `line-${timestamp}`,
          characterId: DEFAULT_CHARACTER_POOL[0].id,
          text: '',
        },
      ],
    };

    setProject((previous) => ({
      ...previous,
      scenes: [...previous.scenes, newScene],
      currentSceneId: newScene.id,
    }));
    setActiveSpeakerIndex(0);
    markDirty();
  };

  const deleteScene = (id: string) => {
    if (scenes.length === 1) return;

    setProject((previous) => {
      const newScenes = previous.scenes.filter((scene) => scene.id !== id);

      return {
        ...previous,
        scenes: newScenes,
        currentSceneId:
          previous.currentSceneId === id ? newScenes[0].id : previous.currentSceneId,
      };
    });
    setActiveSpeakerIndex(0);
    markDirty();
  };

  const selectScene = (sceneId: string) => {
    setProject((previous) =>
      previous.currentSceneId === sceneId
        ? previous
        : { ...previous, currentSceneId: sceneId }
    );
    setActiveSpeakerIndex(0);
  };

  const updateCharacterName = (charId: string, name: string) => {
    if (currentScene.characters.find((character) => character.id === charId)?.name === name) {
      return;
    }

    updateCurrentScene((scene) => ({
      ...scene,
      characters: scene.characters.map((character) =>
        character.id === charId ? { ...character, name } : character
      ),
    }));
  };

  const updateCharacterColor = (charId: string, color: string) => {
    setActiveColorPicker(null);

    if (
      currentScene.characters.find((character) => character.id === charId)?.color ===
      color
    ) {
      return;
    }

    updateCurrentScene((scene) => ({
      ...scene,
      characters: scene.characters.map((character) =>
        character.id === charId ? { ...character, color } : character
      ),
    }));
  };

  const addCharacter = () => {
    if (currentScene.characters.length >= 4) return;

    const usedIds = currentScene.characters.map((character) => character.id);
    const nextAvailable =
      DEFAULT_CHARACTER_POOL.find((character) => !usedIds.includes(character.id)) ??
      createFallbackCharacter(currentScene.characters.length);

    updateCurrentScene((scene) => ({
      ...scene,
      characters: [...scene.characters, nextAvailable],
    }));
  };

  const removeCharacter = (charId: string) => {
    if (currentScene.characters.length <= 1) return;

    updateCurrentScene((scene) => {
      const newCharacters = scene.characters.filter(
        (character) => character.id !== charId
      );
      const newLines = scene.lines.map((line) =>
        line.characterId === charId
          ? { ...line, characterId: newCharacters[0].id }
          : line
      );

      return { ...scene, characters: newCharacters, lines: newLines };
    });

    if (activeSpeakerIndex >= currentScene.characters.length - 1) {
      setActiveSpeakerIndex(0);
    }
    setCharacterToDelete(null);
  };

  const exportAsMarkdown = useCallback(() => {
    const content = currentScene.lines
      .map((line) => {
        if (isHeader(line.text)) return line.text;
        const character = currentScene.characters.find(
          (candidate) => candidate.id === line.characterId
        );
        return `${character?.name || 'Unknown'}: ${line.text}`;
      })
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${currentScene.name}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [currentScene]);

  useEffect(() => {
    const api = getDesktopApi();
    const unsubscribe = [
      api.onMenuNew(() => {
        void handleNewProject();
      }),
      api.onMenuOpen(() => {
        void handleOpenProject();
      }),
      api.onMenuSave(() => {
        void handleSaveProject();
      }),
      api.onMenuSaveAs(() => {
        void handleSaveProjectAs();
      }),
      api.onMenuExport(exportAsMarkdown),
    ];

    return () => {
      unsubscribe.forEach((removeListener) => removeListener());
    };
  }, [
    exportAsMarkdown,
    handleNewProject,
    handleOpenProject,
    handleSaveProject,
    handleSaveProjectAs,
  ]);

  const wordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentScene.characters.forEach((character) => {
      counts[character.id] = 0;
    });
    let total = 0;

    currentScene.lines.forEach((line) => {
      if (isHeader(line.text)) return;
      const words = line.text.trim().split(/\s+/).filter(Boolean).length;
      if (counts[line.characterId] !== undefined) {
        counts[line.characterId] += words;
      }
      total += words;
    });

    return { perCharacter: counts, total };
  }, [currentScene]);

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <aside className="w-56 bg-[#FAFAF8] border-r border-stone-200 dark:bg-[#303030] dark:border-white/5 flex flex-col transition-colors duration-200">
        <div className="p-6 pb-2">
          <h1 className="font-serif italic text-xl dark:text-[#D6D3D1]">Vicarious</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="flex items-center justify-between mb-3 mt-2 px-2">
            <span className="text-[10px] font-mono font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-widest">
              Scenes
            </span>
            <button
              onClick={addScene}
              className="p-1 -mr-1 hover:bg-stone-200 dark:hover:bg-white/10 rounded transition-colors text-stone-400 hover:text-stone-900 dark:text-zinc-500 dark:hover:text-zinc-100"
              title="Add Scene"
            >
              <Plus size={14} />
            </button>
          </div>
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                scene.id === currentSceneId
                  ? 'bg-white shadow-sm ring-1 ring-stone-200 text-[#1C1917] dark:bg-[#2A2A2A] dark:ring-white/5 dark:text-[#D6D3D1]'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-[#D6D3D1]'
              }`}
              onClick={() => selectScene(scene.id)}
            >
              <div className="flex items-center gap-2 truncate">
                <ChevronRight
                  size={14}
                  className={
                    scene.id === currentSceneId
                      ? 'text-[#1C1917] dark:text-[#D6D3D1]'
                      : 'text-stone-300 dark:text-zinc-600'
                  }
                />
                <span className="truncate text-sm">{scene.name}</span>
              </div>
              {scenes.length > 1 && scene.id === currentSceneId && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteScene(scene.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-stone-400 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div
          className="p-6 pb-4 flex items-center justify-between cursor-pointer group text-stone-500 hover:text-[#1C1917] dark:text-zinc-400 dark:hover:text-[#D6D3D1] transition-colors"
          onClick={() => setIsDarkMode(!isDarkMode)}
        >
          <div className="flex items-center gap-2">
            {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-sm font-medium">Dark Mode</span>
          </div>
          <button
            type="button"
            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
              isDarkMode ? 'bg-zinc-600' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-white/5 space-y-1">
          <div className="text-[10px] font-mono font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-widest mb-2 mt-1 px-2">
            Project
          </div>
          <div
            className="px-2 pb-2 text-[11px] text-stone-400 dark:text-zinc-500 truncate"
            title={filePath ?? 'Unsaved project'}
          >
            {filePath ? fileNameFromPath(filePath) : 'Unsaved project'}
            {isDirty ? ' *' : ''}
          </div>
          {projectError && (
            <div className="px-2 py-2 rounded-md text-xs leading-snug text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10">
              {projectError}
            </div>
          )}
          {projectStatus && !projectError && (
            <div className="px-2 pb-1 text-[11px] text-stone-400 dark:text-zinc-500 truncate">
              {projectStatus}
            </div>
          )}
          <button
            onClick={handleOpenProject}
            className="w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <FolderOpen size={16} />
            Open Project
          </button>
          <button
            onClick={() => void handleSaveProject()}
            className="w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={() => void handleSaveProjectAs()}
            className="w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <SaveAll size={16} />
            Save As...
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[#F2F2EF] dark:bg-[#2A2A2A] transition-colors duration-200">
        <header className="h-16 border-b border-stone-200 dark:border-white/10 flex items-center justify-between px-8 bg-[#F2F2EF]/80 dark:bg-[#2A2A2A]/80 backdrop-blur-sm z-10 sticky top-0 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <input
              value={currentScene.name}
              onChange={(event) =>
                updateCurrentScene((scene) => ({ ...scene, name: event.target.value }))
              }
              className="font-serif italic text-lg bg-transparent border-none outline-none focus:ring-0 w-64 dark:text-[#D6D3D1]"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="text-xs font-mono text-stone-400 dark:text-zinc-500 uppercase tracking-widest">
              Words: {wordCounts.total}
            </div>
            <button
              onClick={exportAsMarkdown}
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest px-4 py-2 bg-stone-700 dark:bg-white dark:text-stone-900 text-white rounded-md hover:bg-stone-600 dark:hover:bg-zinc-200 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-[1.8] flex flex-col min-w-0">
            <Editor
              scene={currentScene}
              characters={currentScene.characters}
              activeSpeakerIndex={activeSpeakerIndex}
              onUpdate={(lines: DialogueLine[]) =>
                updateCurrentScene((scene) => ({ ...scene, lines }))
              }
              setActiveSpeakerIndex={setActiveSpeakerIndex}
              isDarkMode={isDarkMode}
              setActiveLineId={setActiveLineId}
            />
          </div>
          <div className="flex-1 hidden md:flex flex-col min-w-0">
            <Preview
              scene={currentScene}
              characters={currentScene.characters}
              isDarkMode={isDarkMode}
              activeLineId={activeLineId}
            />
          </div>
        </div>

        <footer className="h-14 border-t border-stone-200 dark:border-white/5 bg-[#FAFAF8] dark:bg-[#303030] flex items-center px-6 gap-8 overflow-visible relative z-20 transition-colors duration-200">
          {currentScene.characters.map((character, index) => (
            <div
              key={character.id}
              id={`char-slot-${index}`}
              onClick={() => setActiveSpeakerIndex(index)}
              className={`flex items-center gap-3 shrink-0 cursor-pointer group transition-opacity relative ${
                index === activeSpeakerIndex
                  ? 'opacity-100'
                  : 'opacity-40 hover:opacity-60 dark:opacity-50 dark:hover:opacity-75'
              }`}
            >
              <div className="relative z-50 flex items-center justify-center w-2.5 h-2.5">
                <div
                  className="w-full h-full rounded-full transition-transform hover:scale-150 cursor-pointer"
                  style={{
                    backgroundColor: getAdaptiveColor(character.color, isDarkMode),
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveColorPicker(
                      activeColorPicker === character.id ? null : character.id
                    );
                  }}
                />

                {activeColorPicker === character.id && (
                  <div
                    className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-[#FAFAF8] dark:bg-[#303030] border border-stone-200 dark:border-white/10 p-2 rounded-lg shadow-xl grid grid-cols-5 gap-2 w-[140px] z-50 cursor-default"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {PALETTE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateCharacterColor(character.id, color)}
                        className="w-5 h-5 rounded-full border border-stone-200 dark:border-white/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: getAdaptiveColor(color, isDarkMode) }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[6px] w-3 h-3 bg-[#FAFAF8] dark:bg-[#303030] border-b border-r border-stone-200 dark:border-white/10 rotate-45" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <input
                  value={character.name}
                  onChange={(event) =>
                    updateCharacterName(character.id, event.target.value)
                  }
                  onClick={(event) => event.stopPropagation()}
                  className="bg-transparent border-none outline-none focus:ring-0 text-xs font-medium p-0 w-24 h-4 cursor-text text-[#1C1917] dark:text-[#D6D3D1]"
                />
                <span className="text-[10px] font-mono text-stone-400 dark:text-zinc-500 uppercase">
                  {wordCounts.perCharacter[character.id]} words
                </span>
              </div>

              {currentScene.characters.length > 1 && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setCharacterToDelete(character);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-all absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {currentScene.characters.length < 4 && (
            <button
              onClick={addCharacter}
              className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-all text-stone-500 dark:text-zinc-400 dark:hover:text-zinc-200 group"
            >
              <Plus size={14} className="group-hover:rotate-90 transition-transform" />
              <span className="text-[10px] font-mono uppercase tracking-tight">
                Add Character
              </span>
            </button>
          )}

          <div className="ml-auto text-[10px] font-mono text-stone-400 dark:text-zinc-500 uppercase tracking-tight whitespace-nowrap">
            TAB TO SWITCH SPEAKER
          </div>
        </footer>
      </main>

      <AnimatePresence>
        {characterToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/20 dark:bg-black/40 backdrop-blur-sm z-50 transition-colors duration-200"
              onClick={() => setCharacterToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#FAFAF8] dark:bg-[#303030] rounded-2xl shadow-2xl p-6 z-50 border border-stone-200 dark:border-white/10 transition-colors duration-200"
            >
              <h3 className="text-lg font-medium text-[#1C1917] dark:text-[#D6D3D1] mb-2">
                Delete Character?
              </h3>
              <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                Are you sure you want to delete{' '}
                <strong className="font-semibold">{characterToDelete.name}</strong> from
                this scene? Any existing lines for this character will be reassigned to{' '}
                {
                  currentScene.characters.find(
                    (character) => character.id !== characterToDelete.id
                  )?.name
                }.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCharacterToDelete(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeCharacter(characterToDelete.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-500/90 dark:hover:bg-red-500 transition-colors shadow-sm"
                >
                  Delete Character
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function isHeader(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('[') ||
    trimmed.startsWith('INT.') ||
    trimmed.startsWith('EXT.')
  );
}

function createFallbackCharacter(index: number): Character {
  const id = `character-${Date.now()}`;

  return {
    id,
    name: `Character ${index + 1}`,
    color: PALETTE_COLORS[index % PALETTE_COLORS.length],
  };
}

function fileNameFromPath(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const invokeMessage = error.message.match(
      /^Error invoking remote method '[^']+': Error: (.+)$/
    );

    return invokeMessage?.[1] ?? error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Project operation failed.';
}

function getDesktopApi(): Window['api'] {
  if (!window.api) {
    throw new Error(
      'Desktop API is unavailable. Restart the app with npm run dev so Electron can load the preload script.'
    );
  }

  return window.api;
}
