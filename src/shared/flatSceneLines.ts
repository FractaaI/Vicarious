import type { DialogueBlock, Scene } from './projectTypes';

export interface FlatSceneWordCounts {
  perCharacter: Record<string, number>;
  total: number;
}

export function hasBranchingStructure(scene: Scene): boolean {
  return (
    scene.sections.length !== 1 ||
    scene.sections.some(
      (section) =>
        section.nextSectionId !== null ||
        section.blocks.some((block) => block.type === 'choice')
    )
  );
}

export function canEditSceneAsFlatDialogue(scene: Scene): boolean {
  return !hasBranchingStructure(scene);
}

export function getEditableDialogueBlocksForNonBranchingScene(
  scene: Scene
): readonly DialogueBlock[] | null {
  if (!canEditSceneAsFlatDialogue(scene)) {
    return null;
  }

  return scene.sections[0]?.blocks as readonly DialogueBlock[];
}

export function replaceEditableDialogueBlocksInNonBranchingScene(
  scene: Scene,
  blocks: DialogueBlock[]
): Scene {
  if (!canEditSceneAsFlatDialogue(scene)) {
    throw new Error('Branching scenes cannot be edited by the flat dialogue editor.');
  }

  return {
    ...scene,
    sections: [
      {
        ...scene.sections[0],
        blocks,
      },
    ],
  };
}

export function reassignSceneCharacterReferences(
  scene: Scene,
  fromCharacterId: string,
  toCharacterId: string
): Scene {
  return {
    ...scene,
    sections: scene.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => {
        if (block.type === 'dialogue') {
          return block.characterId === fromCharacterId
            ? { ...block, characterId: toCharacterId }
            : block;
        }

        return {
          ...block,
          options: block.options.map((option) =>
            option.characterId === fromCharacterId
              ? { ...option, characterId: toCharacterId }
              : option
          ),
        };
      }),
    })),
  };
}

export function isSceneDirectionText(text: string): boolean {
  const trimmed = text.trim();

  return (
    trimmed.startsWith('[') ||
    trimmed.startsWith('INT.') ||
    trimmed.startsWith('EXT.')
  );
}

export function isSceneDirectionLine(line: DialogueBlock): boolean {
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
  line: DialogueBlock,
  wordThreshold = 25
): boolean {
  return !isSceneDirectionLine(line) && countWords(line.text) > wordThreshold;
}

export function isGroupedWithPreviousDialogueLine(
  line: DialogueBlock,
  previousLine: DialogueBlock | null
): boolean {
  return Boolean(
    previousLine &&
      !isSceneDirectionLine(previousLine) &&
      previousLine.characterId === line.characterId
  );
}

export function calculateSceneDialogueWordCounts(scene: Scene): FlatSceneWordCounts {
  const counts: Record<string, number> = {};
  scene.characters.forEach((character) => {
    counts[character.id] = 0;
  });

  let total = 0;

  scene.sections.forEach((section) => {
    section.blocks.forEach((block) => {
      if (block.type !== 'dialogue' || isSceneDirectionLine(block)) {
        return;
      }

      const words = countWords(block.text);

      if (counts[block.characterId] !== undefined) {
        counts[block.characterId] += words;
      }

      total += words;
    });
  });

  return { perCharacter: counts, total };
}
