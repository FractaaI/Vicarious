export interface Character {
  id: string;
  name: string;
  color: string;
}

export interface DialogueLine {
  id: string;
  characterId: string;
  text: string;
  isHeader?: boolean;
}

export interface Scene {
  id: string;
  name: string;
  lines: DialogueLine[];
  characters: Character[];
}

export interface VicariousProject {
  version: 1;
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
