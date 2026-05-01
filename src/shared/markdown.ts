import type { DialogueLine, Scene } from './projectTypes';

export function formatSceneAsMarkdown(scene: Scene): string {
  return scene.lines.map((line) => formatDialogueLine(line, scene)).join('\n\n');
}

export function isSceneDirection(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith('[') ||
    trimmed.startsWith('INT.') ||
    trimmed.startsWith('EXT.')
  );
}

function formatDialogueLine(line: DialogueLine, scene: Scene): string {
  if (isSceneDirection(line.text)) {
    return line.text;
  }

  const character = scene.characters.find(
    (candidate) => candidate.id === line.characterId
  );

  return `${character?.name || 'Unknown'}: ${line.text}`;
}
