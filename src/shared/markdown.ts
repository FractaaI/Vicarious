import type { DialogueLine, Scene } from './projectTypes';
import {
  getFlatSceneLines,
  isSceneDirectionLine,
  isSceneDirectionText,
} from './flatSceneLines';

export function formatSceneAsMarkdown(scene: Scene): string {
  return getFlatSceneLines(scene)
    .map((line) => formatDialogueLine(line, scene))
    .join('\n\n');
}

export function isSceneDirection(text: string): boolean {
  return isSceneDirectionText(text);
}

function formatDialogueLine(line: DialogueLine, scene: Scene): string {
  if (isSceneDirectionLine(line)) {
    return line.text;
  }

  const character = scene.characters.find(
    (candidate) => candidate.id === line.characterId
  );

  return `${character?.name || 'Unknown'}: ${line.text}`;
}
