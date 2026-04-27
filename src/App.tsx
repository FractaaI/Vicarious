import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Menu, Plus, Download, ChevronRight, MessageSquare, Trash2, Edit2, Moon, Sun, UploadCloud, DownloadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Scene, Character, DialogueLine } from './types';
import { PALETTE_COLORS, getAdaptiveColor } from './utils/colors';

const DEFAULT_CHARACTER_POOL: Character[] = [
  { id: '1', name: 'Character 1', color: PALETTE_COLORS[0] },
  { id: '2', name: 'Character 2', color: PALETTE_COLORS[3] },
  { id: '3', name: 'Character 3', color: PALETTE_COLORS[4] },
  { id: '4', name: 'Character 4', color: PALETTE_COLORS[5] },
];

const INITIAL_SCENE: Scene = {
  id: 'scene-1',
  name: 'Scene 1',
  characters: [DEFAULT_CHARACTER_POOL[0], DEFAULT_CHARACTER_POOL[1]],
  lines: [
    { id: 'initial-line', characterId: '1', text: '' }
  ]
};

export default function App() {
  const [scenes, setScenes] = useState<Scene[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vicarious-scenes');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse scenes from localStorage", e);
        }
      }
    }
    return [INITIAL_SCENE];
  });
  
  const [currentSceneId, setCurrentSceneId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vicarious-current-scene');
      if (saved) return saved;
    }
    return INITIAL_SCENE.id;
  });
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

  useEffect(() => {
    localStorage.setItem('vicarious-scenes', JSON.stringify(scenes));
    localStorage.setItem('vicarious-current-scene', currentSceneId);
  }, [scenes, currentSceneId]);

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

  const currentScene = useMemo(() => 
    scenes.find(s => s.id === currentSceneId) || scenes[0], 
  [scenes, currentSceneId]);

  const updateCurrentScene = useCallback((updater: (scene: Scene) => Scene) => {
    setScenes(prev => prev.map(s => s.id === currentSceneId ? updater(s) : s));
  }, [currentSceneId]);

  const addScene = () => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${scenes.length + 1}`,
      characters: [DEFAULT_CHARACTER_POOL[0], DEFAULT_CHARACTER_POOL[1]],
      lines: [{ id: `line-${Date.now()}`, characterId: DEFAULT_CHARACTER_POOL[0].id, text: '' }]
    };
    setScenes([...scenes, newScene]);
    setCurrentSceneId(newScene.id);
    setActiveSpeakerIndex(0);
  };

  const deleteScene = (id: string) => {
    if (scenes.length === 1) return;
    const newScenes = scenes.filter(s => s.id !== id);
    setScenes(newScenes);
    if (currentSceneId === id) {
      setCurrentSceneId(newScenes[0].id);
      setActiveSpeakerIndex(0);
    }
  };

  const updateCharacterName = (charId: string, name: string) => {
    updateCurrentScene(scene => ({
      ...scene,
      characters: scene.characters.map(c => c.id === charId ? { ...c, name } : c)
    }));
  };

  const updateCharacterColor = (charId: string, color: string) => {
    updateCurrentScene(scene => ({
      ...scene,
      characters: scene.characters.map(c => c.id === charId ? { ...c, color } : c)
    }));
    setActiveColorPicker(null);
  };

  const addCharacter = () => {
    if (currentScene.characters.length >= 4) return;
    
    // Find a color/id from pool that isn't used yet in this scene
    const usedIds = currentScene.characters.map(c => c.id);
    const nextAvailable = DEFAULT_CHARACTER_POOL.find(p => !usedIds.includes(p.id)) || DEFAULT_CHARACTER_POOL[currentScene.characters.length];
    
    updateCurrentScene(scene => ({
      ...scene,
      characters: [...scene.characters, nextAvailable]
    }));
  };

  const removeCharacter = (charId: string) => {
    if (currentScene.characters.length <= 1) return;
    
    updateCurrentScene(scene => {
      const newChars = scene.characters.filter(c => c.id !== charId);
      // Reassign lines that were from this character to the first character in the scene
      const newLines = scene.lines.map(line => 
        line.characterId === charId ? { ...line, characterId: newChars[0].id } : line
      );
      return { ...scene, characters: newChars, lines: newLines };
    });
    
    // Fix active speaker index if it's out of bounds
    if (activeSpeakerIndex >= currentScene.characters.length - 1) {
      setActiveSpeakerIndex(0);
    }
    setCharacterToDelete(null); // Close modal
  };

  const exportAsMarkdown = () => {
    const content = currentScene.lines.map(line => {
      if (isHeader(line.text)) return line.text;
      const char = currentScene.characters.find(c => c.id === line.characterId);
      return `${char?.name || 'Unknown'}: ${line.text}`;
    }).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentScene.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProject = () => {
    const projectData = {
      version: 1,
      scenes,
      currentSceneId
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vicarious-project-${new Date().toISOString().split('T')[0]}.vicarious`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && data.scenes && Array.isArray(data.scenes)) {
          setScenes(data.scenes);
          setCurrentSceneId(data.currentSceneId || data.scenes[0].id);
          setActiveSpeakerIndex(0);
        } else {
          alert('Invalid project file format.');
        }
      } catch (err) {
        alert('Error importing project. Was this a valid .vicarious file?');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const isHeader = (text: string) => {
    const t = text.trim();
    return t.startsWith('[') || t.startsWith('INT.') || t.startsWith('EXT.');
  };

  // Word counts
  const wordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentScene.characters.forEach(c => counts[c.id] = 0);
    let total = 0;

    currentScene.lines.forEach(line => {
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
      {/* Sidebar */}
      <aside className="w-56 bg-[#FAFAF8] border-r border-stone-200 dark:bg-[#303030] dark:border-white/5 flex flex-col transition-colors duration-200">
        <div className="p-6 pb-2">
          <h1 className="font-serif italic text-xl dark:text-[#D6D3D1]">Vicarious</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="flex items-center justify-between mb-3 mt-2 px-2">
            <span className="text-[10px] font-mono font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-widest">Scenes</span>
            <button 
              onClick={addScene}
              className="p-1 -mr-1 hover:bg-stone-200 dark:hover:bg-white/10 rounded transition-colors text-stone-400 hover:text-stone-900 dark:text-zinc-500 dark:hover:text-zinc-100"
              title="Add Scene"
            >
              <Plus size={14} />
            </button>
          </div>
          {scenes.map(scene => (
            <div 
              key={scene.id}
              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                scene.id === currentSceneId 
                  ? 'bg-white shadow-sm ring-1 ring-stone-200 text-[#1C1917] dark:bg-[#2A2A2A] dark:ring-white/5 dark:text-[#D6D3D1]' 
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-[#D6D3D1]'
              }`}
              onClick={() => setCurrentSceneId(scene.id)}
            >
              <div className="flex items-center gap-2 truncate">
                <ChevronRight size={14} className={scene.id === currentSceneId ? 'text-[#1C1917] dark:text-[#D6D3D1]' : 'text-stone-300 dark:text-zinc-600'} />
                <span className="truncate text-sm">{scene.name}</span>
              </div>
              {scenes.length > 1 && scene.id === currentSceneId && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-stone-400 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Dark Mode Toggle */}
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

        {/* Project Tools */}
        <div className="p-4 border-t border-stone-200 dark:border-white/5 space-y-1">
          <div className="text-[10px] font-mono font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-widest mb-3 mt-1 px-2">Project</div>
          <button 
            onClick={exportProject}
            className="w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <DownloadCloud size={16} />
            Save Backup
          </button>
          <label className="w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <UploadCloud size={16} />
            Load Backup
            <input 
              type="file" 
              accept=".vicarious,.json" 
              className="hidden" 
              onChange={importProject} 
            />
          </label>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#F2F2EF] dark:bg-[#2A2A2A] transition-colors duration-200">
        {/* Header */}
        <header className="h-16 border-b border-stone-200 dark:border-white/10 flex items-center justify-between px-8 bg-[#F2F2EF]/80 dark:bg-[#2A2A2A]/80 backdrop-blur-sm z-10 sticky top-0 transition-colors duration-200">
          <div className="flex items-center gap-4">
             <input 
               value={currentScene.name}
               onChange={(e) => updateCurrentScene(s => ({ ...s, name: e.target.value }))}
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

        {/* Editor & Preview Split */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-[1.8] flex flex-col min-w-0">
            <Editor 
              scene={currentScene} 
              characters={currentScene.characters}
              activeSpeakerIndex={activeSpeakerIndex}
              onUpdate={(lines) => updateCurrentScene(s => ({ ...s, lines }))}
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

        {/* Bottom Bar */}
        <footer className="h-14 border-t border-stone-200 dark:border-white/5 bg-[#FAFAF8] dark:bg-[#303030] flex items-center px-6 gap-8 overflow-visible relative z-20 transition-colors duration-200">
          {currentScene.characters.map((char, index) => (
            <div 
              key={char.id}
              id={`char-slot-${index}`}
              onClick={() => setActiveSpeakerIndex(index)}
              className={`flex items-center gap-3 shrink-0 cursor-pointer group transition-opacity relative ${
                index === activeSpeakerIndex ? 'opacity-100' : 'opacity-40 hover:opacity-60 dark:opacity-50 dark:hover:opacity-75'
              }`}
            >
              <div className="relative z-50 flex items-center justify-center w-2.5 h-2.5">
                <div 
                  className="w-full h-full rounded-full transition-transform hover:scale-150 cursor-pointer" 
                  style={{ backgroundColor: getAdaptiveColor(char.color, isDarkMode) }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveColorPicker(activeColorPicker === char.id ? null : char.id);
                  }}
                />
                
                {activeColorPicker === char.id && (
                  <div 
                    className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-[#FAFAF8] dark:bg-[#303030] border border-stone-200 dark:border-white/10 p-2 rounded-lg shadow-xl grid grid-cols-5 gap-2 w-[140px] z-50 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {PALETTE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateCharacterColor(char.id, color)}
                        className="w-5 h-5 rounded-full border border-stone-200 dark:border-white/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: getAdaptiveColor(color, isDarkMode) }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                    {/* Tiny downward arrow for the tooltip-like look */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[6px] w-3 h-3 bg-[#FAFAF8] dark:bg-[#303030] border-b border-r border-stone-200 dark:border-white/10 rotate-45" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <input 
                  value={char.name}
                  onChange={(e) => updateCharacterName(char.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-none outline-none focus:ring-0 text-xs font-medium p-0 w-24 h-4 cursor-text text-[#1C1917] dark:text-[#D6D3D1]"
                />
                <span className="text-[10px] font-mono text-stone-400 dark:text-zinc-500 uppercase">
                  {wordCounts.perCharacter[char.id]} words
                </span>
              </div>
              
              {currentScene.characters.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setCharacterToDelete(char); }}
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
              <span className="text-[10px] font-mono uppercase tracking-tight">Add Character</span>
            </button>
          )}

          <div className="ml-auto text-[10px] font-mono text-stone-400 dark:text-zinc-500 uppercase tracking-tight whitespace-nowrap">
            TAB TO SWITCH SPEAKER
          </div>
        </footer>
      </main>

      {/* Delete Character Modal */}
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
              <h3 className="text-lg font-medium text-[#1C1917] dark:text-[#D6D3D1] mb-2">Delete Character?</h3>
              <p className="text-stone-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                Are you sure you want to delete <strong className="font-semibold">{characterToDelete.name}</strong> from this scene? Any existing lines for this character will be reassigned to {currentScene.characters.find(c => c.id !== characterToDelete.id)?.name}.
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

// Sub-components will be moved to their own files if they get too big, but for now I'll define logic placeholders.
import Editor from './components/Editor';
import Preview from './components/Preview';
