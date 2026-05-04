import type { DialogueBlock, Scene } from './projectTypes';
import {
  getEditableDialogueBlocksForNonBranchingScene,
  isSceneDirectionLine,
  isSceneDirectionText,
} from './flatSceneLines';

export function formatSceneAsMarkdown(scene: Scene): string {
  const blocks = getEditableDialogueBlocksForNonBranchingScene(scene);

  if (!blocks) {
    throw new Error('Branching scene export is not available yet.');
  }

  return blocks
    .map((line) => formatDialogueLine(line, scene))
    .join('\n\n');
}

export function isSceneDirection(text: string): boolean {
  return isSceneDirectionText(text);
}

function formatDialogueLine(line: DialogueBlock, scene: Scene): string {
  if (isSceneDirectionLine(line)) {
    return line.text;
  }

  const character = scene.characters.find(
    (candidate) => candidate.id === line.characterId
  );

  return `${character?.name || 'Unknown'}: ${line.text}`;
}
