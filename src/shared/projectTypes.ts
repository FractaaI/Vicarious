export interface Character {
  id: string;
  name: string;
  color: string;
}

export interface DialogueBlock {
  id: string;
  type: 'dialogue';
  characterId: string;
  text: string;
  isHeader?: boolean;
}

export type DialogueLine = DialogueBlock;

export interface ChoiceOption {
  id: string;
  characterId: string;
  text: string;
  targetSectionId: string | null;
}

export interface ChoiceBlock {
  id: string;
  type: 'choice';
  options: ChoiceOption[];
}

export type SceneBlock = DialogueBlock | ChoiceBlock;

export interface SceneSection {
  id: string;
  name: string;
  blocks: SceneBlock[];
  nextSectionId: string | null;
}

export interface Scene {
  id: string;
  name: string;
  characters: Character[];
  sections: SceneSection[];
}

export interface VicariousProject {
  version: 2;
  id: string;
  title: string;
  scenes: Scene[];
  currentSceneId: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    appVersion: string;
  };
}

export interface RecoveryFile {
  version: 1;
  savedAt: string;
  filePath: string | null;
  isDirty: boolean;
  project: VicariousProject;
}
