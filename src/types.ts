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
