import type { DialogueLine, Scene } from './projectTypes';

export interface FlatSceneWordCounts {
  perCharacter: Record<string, number>;
  total: number;
}

export function getFlatSceneLines(scene: Scene): readonly DialogueLine[] {
  return scene.lines;
}

export function isSceneDirectionText(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith('[') ||
    trimmed.startsWith('INT.') ||
    trimmed.startsWith('EXT.')
  );
}

export function isSceneDirectionLine(line: DialogueLine): boolean {
  return isSceneDirectionText(line.text);
}

export function formatSceneDirectionPreviewText(text: string): string {
  if (text.trim().startsWith('[')) {
    return text.trim().replace(/^\[|\]$/g, '');
  }

  return text;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isLongDialogueLine(
  line: DialogueLine,
  wordThreshold = 25
): boolean {
  return !isSceneDirectionLine(line) && countWords(line.text) > wordThreshold;
}

export function isGroupedWithPreviousDialogueLine(
  line: DialogueLine,
  previousLine: DialogueLine | null
): boolean {
  return Boolean(
    previousLine &&
      !isSceneDirectionLine(previousLine) &&
      previousLine.characterId === line.characterId
  );
}

export function calculateFlatSceneWordCounts(scene: Scene): FlatSceneWordCounts {
  const counts: Record<string, number> = {};
  scene.characters.forEach((character) => {
    counts[character.id] = 0;
  });

  let total = 0;

  getFlatSceneLines(scene).forEach((line) => {
    if (isSceneDirectionLine(line)) {
      return;
    }

    const words = countWords(line.text);

    if (counts[line.characterId] !== undefined) {
      counts[line.characterId] += words;
    }

    total += words;
  });

  return { perCharacter: counts, total };
}
