import type {
  ChoiceBlock,
  ChoiceOption,
  DialogueBlock,
  Scene,
  SceneBlock,
  SceneSection,
} from './projectTypes';

export interface SectionEditResult {
  scene: Scene;
  error: string | null;
}

export interface SplitDialogueResult {
  scene: Scene;
  newBlockId: string;
}

export interface MergeDialogueResult {
  scene: Scene;
  focusBlockId: string;
  cursorPosition: number;
}

export interface CreateChoiceResult {
  scene: Scene;
  choiceBlockId: string;
  firstOptionId: string;
  continuationSectionId: string | null;
}

export interface CreateChoiceTargetSectionResult {
  scene: Scene;
  sectionId: string;
  firstBlockId: string;
  error: string | null;
}

export interface DialogueBlockPosition {
  sectionId: string;
  blockId: string;
  sectionIndex: number;
  blockIndex: number;
}

export function getDialogueBlockPositions(scene: Scene): DialogueBlockPosition[] {
  return scene.sections.flatMap((section, sectionIndex) =>
    section.blocks.flatMap((block, blockIndex) =>
      block.type === 'dialogue'
        ? [
            {
              sectionId: section.id,
              blockId: block.id,
              sectionIndex,
              blockIndex,
            },
          ]
        : []
    )
  );
}

export function addSceneSection(
  scene: Scene,
  characterId: string,
  generateId: () => string = createTimestampId
): Scene {
  const sectionId = createUniqueId(scene, 'section', generateId);
  const blockId = createUniqueId(scene, 'line', generateId);
  const sectionNumber = scene.sections.length + 1;
  const newSection: SceneSection = {
    id: sectionId,
    name: `Section ${sectionNumber}`,
    nextSectionId: null,
    blocks: [
      {
        id: blockId,
        type: 'dialogue',
        characterId,
        text: '',
      },
    ],
  };

  return {
    ...scene,
    sections: [...scene.sections, newSection],
  };
}

export function renameSceneSection(
  scene: Scene,
  sectionId: string,
  name: string
): Scene {
  return updateSection(scene, sectionId, (section) => ({ ...section, name }));
}

export function updateDialogueBlockText(
  scene: Scene,
  sectionId: string,
  blockId: string,
  text: string
): Scene {
  return updateDialogueBlock(scene, sectionId, blockId, (block) => ({
    ...block,
    text,
  }));
}

export function updateDialogueBlockSpeaker(
  scene: Scene,
  sectionId: string,
  blockId: string,
  characterId: string
): Scene {
  if (!scene.characters.some((character) => character.id === characterId)) {
    return scene;
  }

  return updateDialogueBlock(scene, sectionId, blockId, (block) => ({
    ...block,
    characterId,
  }));
}

export function splitDialogueBlock(
  scene: Scene,
  sectionId: string,
  blockId: string,
  cursorPosition: number,
  characterId: string,
  generateId: () => string = createTimestampId
): SplitDialogueResult | null {
  const sectionIndex = scene.sections.findIndex((section) => section.id === sectionId);

  if (sectionIndex === -1) {
    return null;
  }

  const section = scene.sections[sectionIndex];
  const blockIndex = section.blocks.findIndex((block) => block.id === blockId);
  const block = section.blocks[blockIndex];

  if (!block || block.type !== 'dialogue') {
    return null;
  }

  const boundedCursor = Math.max(0, Math.min(cursorPosition, block.text.length));
  const textBefore = block.text.substring(0, boundedCursor);
  const textAfter = block.text.substring(boundedCursor);
  const newBlockId = createUniqueId(scene, 'line', generateId);
  const newBlock: DialogueBlock = {
    id: newBlockId,
    type: 'dialogue',
    characterId,
    text: textAfter,
  };
  const blocks = [...section.blocks];
  blocks[blockIndex] = { ...block, text: textBefore };
  blocks.splice(blockIndex + 1, 0, newBlock);

  return {
    scene: replaceSectionAt(scene, sectionIndex, { ...section, blocks }),
    newBlockId,
  };
}

export function createChoiceFromDialogueBlock(
  scene: Scene,
  sectionId: string,
  blockId: string,
  characterId: string,
  generateId: () => string = createTimestampId
): CreateChoiceResult | null {
  if (!scene.characters.some((character) => character.id === characterId)) {
    return null;
  }

  const sectionIndex = scene.sections.findIndex((section) => section.id === sectionId);

  if (sectionIndex === -1) {
    return null;
  }

  const section = scene.sections[sectionIndex];
  const blockIndex = section.blocks.findIndex((block) => block.id === blockId);
  const block = section.blocks[blockIndex];

  if (!block || block.type !== 'dialogue' || block.text.trim() !== '/choice') {
    return null;
  }

  const choiceBlockId = createUniqueId(scene, 'choice', generateId);
  const firstOptionId = createUniqueId(scene, 'option', generateId);
  const choiceBlock: ChoiceBlock = {
    id: choiceBlockId,
    type: 'choice',
    options: [
      {
        id: firstOptionId,
        characterId,
        text: '',
        targetSectionId: null,
      },
    ],
  };
  const leadingBlocks = section.blocks.slice(0, blockIndex);
  const trailingBlocks = section.blocks.slice(blockIndex + 1);

  if (trailingBlocks.length === 0) {
    const blocks = [...leadingBlocks, choiceBlock];

    return {
      scene: replaceSectionAt(scene, sectionIndex, { ...section, blocks }),
      choiceBlockId,
      firstOptionId,
      continuationSectionId: null,
    };
  }

  const continuationSectionId = createUniqueId(scene, 'section', generateId);
  const continuationSection: SceneSection = {
    id: continuationSectionId,
    name: `${section.name.trim() || 'Section'} Continuation`,
    blocks: trailingBlocks,
    nextSectionId: section.nextSectionId,
  };
  const updatedSection: SceneSection = {
    ...section,
    blocks: [...leadingBlocks, choiceBlock],
    nextSectionId: continuationSectionId,
  };
  const sections = [...scene.sections];
  sections.splice(sectionIndex, 1, updatedSection, continuationSection);

  return {
    scene: { ...scene, sections },
    choiceBlockId,
    firstOptionId,
    continuationSectionId,
  };
}

export function mergeDialogueBlockWithPrevious(
  scene: Scene,
  sectionId: string,
  blockId: string
): MergeDialogueResult | null {
  const sectionIndex = scene.sections.findIndex((section) => section.id === sectionId);

  if (sectionIndex === -1) {
    return null;
  }

  const section = scene.sections[sectionIndex];
  const blockIndex = section.blocks.findIndex((block) => block.id === blockId);

  if (blockIndex <= 0) {
    return null;
  }

  const previousBlock = section.blocks[blockIndex - 1];
  const currentBlock = section.blocks[blockIndex];

  if (previousBlock?.type !== 'dialogue' || currentBlock?.type !== 'dialogue') {
    return null;
  }

  const cursorPosition = previousBlock.text.length;
  const blocks = [...section.blocks];
  blocks[blockIndex - 1] = {
    ...previousBlock,
    text: `${previousBlock.text}${currentBlock.text}`,
  };
  blocks.splice(blockIndex, 1);

  return {
    scene: replaceSectionAt(scene, sectionIndex, { ...section, blocks }),
    focusBlockId: previousBlock.id,
    cursorPosition,
  };
}

export function updateChoiceOptionText(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string,
  text: string
): Scene {
  return updateChoiceOption(scene, sectionId, choiceBlockId, optionId, (option) => ({
    ...option,
    text,
  }));
}

export function updateChoiceOptionSpeaker(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string,
  characterId: string
): Scene {
  if (!scene.characters.some((character) => character.id === characterId)) {
    return scene;
  }

  return updateChoiceOption(scene, sectionId, choiceBlockId, optionId, (option) => ({
    ...option,
    characterId,
  }));
}

export function addChoiceOption(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  characterId: string,
  generateId: () => string = createTimestampId
): Scene {
  if (!scene.characters.some((character) => character.id === characterId)) {
    return scene;
  }

  const option: ChoiceOption = {
    id: createUniqueId(scene, 'option', generateId),
    characterId,
    text: '',
    targetSectionId: null,
  };

  return updateChoiceBlock(scene, sectionId, choiceBlockId, (block) => ({
    ...block,
    options: [...block.options, option],
  }));
}

export function removeChoiceOption(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string
): Scene {
  return updateChoiceBlock(scene, sectionId, choiceBlockId, (block) => ({
    ...block,
    options: block.options.filter((option) => option.id !== optionId),
  }));
}

export function updateChoiceOptionTarget(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string,
  targetSectionId: string | null
): SectionEditResult {
  const result = validateChoiceOptionTarget(
    scene,
    sectionId,
    choiceBlockId,
    optionId,
    targetSectionId
  );

  if (result.error) {
    return result;
  }

  return {
    scene: updateChoiceOption(scene, sectionId, choiceBlockId, optionId, (option) => ({
      ...option,
      targetSectionId,
    })),
    error: null,
  };
}

export function createChoiceTargetSection(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string,
  characterId: string,
  generateId: () => string = createTimestampId
): CreateChoiceTargetSectionResult {
  if (!scene.characters.some((character) => character.id === characterId)) {
    return { scene, sectionId: '', firstBlockId: '', error: 'Character no longer exists.' };
  }

  const sourceSectionIndex = scene.sections.findIndex(
    (section) => section.id === sectionId
  );

  if (sourceSectionIndex === -1) {
    return { scene, sectionId: '', firstBlockId: '', error: 'Section no longer exists.' };
  }

  const sourceChoice = scene.sections[sourceSectionIndex].blocks.find(
    (block): block is ChoiceBlock => block.id === choiceBlockId && block.type === 'choice'
  );

  if (!sourceChoice?.options.some((option) => option.id === optionId)) {
    return { scene, sectionId: '', firstBlockId: '', error: 'Choice option no longer exists.' };
  }

  const newSectionId = createUniqueId(scene, 'section', generateId);
  const firstBlockId = createUniqueId(scene, 'line', generateId);
  const newSection: SceneSection = {
    id: newSectionId,
    name: `Section ${scene.sections.length + 1}`,
    nextSectionId: null,
    blocks: [
      {
        id: firstBlockId,
        type: 'dialogue',
        characterId,
        text: '',
      },
    ],
  };
  const sections = [...scene.sections];
  sections.splice(sourceSectionIndex + 1, 0, newSection);
  const sceneWithSection = { ...scene, sections };
  const targetResult = updateChoiceOptionTarget(
    sceneWithSection,
    sectionId,
    choiceBlockId,
    optionId,
    newSectionId
  );

  if (targetResult.error) {
    return {
      scene,
      sectionId: '',
      firstBlockId: '',
      error: targetResult.error,
    };
  }

  return {
    scene: targetResult.scene,
    sectionId: newSectionId,
    firstBlockId,
    error: null,
  };
}

export function deleteSceneSection(scene: Scene, sectionId: string): SectionEditResult {
  const blockReason = getSectionDeleteBlockReason(scene, sectionId);

  if (blockReason) {
    return { scene, error: blockReason };
  }

  return {
    scene: {
      ...scene,
      sections: scene.sections.filter((section) => section.id !== sectionId),
    },
    error: null,
  };
}

export function getSectionDeleteBlockReason(
  scene: Scene,
  sectionId: string
): string | null {
  if (scene.sections.length <= 1) {
    return 'Cannot delete the only section.';
  }

  if (!scene.sections.some((section) => section.id === sectionId)) {
    return 'Section no longer exists.';
  }

  const footerSource = scene.sections.find(
    (section) => section.id !== sectionId && section.nextSectionId === sectionId
  );

  if (footerSource) {
    return `Cannot delete while "${footerSource.name}" continues here.`;
  }

  const choiceTarget = scene.sections.some((section) =>
    section.blocks.some(
      (block) =>
        block.type === 'choice' &&
        block.options.some((option) => option.targetSectionId === sectionId)
    )
  );

  if (choiceTarget) {
    return 'Cannot delete while a choice targets this section.';
  }

  return null;
}

export function updateSceneSectionContinuation(
  scene: Scene,
  sectionId: string,
  nextSectionId: string | null
): SectionEditResult {
  if (!scene.sections.some((section) => section.id === sectionId)) {
    return { scene, error: 'Section no longer exists.' };
  }

  if (
    nextSectionId !== null &&
    !scene.sections.some((section) => section.id === nextSectionId)
  ) {
    return { scene, error: 'Continuation must target a section in this scene.' };
  }

  const nextScene = updateSection(scene, sectionId, (section) => ({
    ...section,
    nextSectionId,
  }));

  if (hasSectionGraphCycle(nextScene)) {
    return { scene, error: 'Continuation would create a cycle.' };
  }

  return { scene: nextScene, error: null };
}

export function canSetSceneSectionContinuation(
  scene: Scene,
  sectionId: string,
  nextSectionId: string | null
): boolean {
  return updateSceneSectionContinuation(scene, sectionId, nextSectionId).error === null;
}

export function canSetChoiceOptionTarget(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string,
  targetSectionId: string | null
): boolean {
  return (
    validateChoiceOptionTarget(
      scene,
      sectionId,
      choiceBlockId,
      optionId,
      targetSectionId
    ).error === null
  );
}

function updateDialogueBlock(
  scene: Scene,
  sectionId: string,
  blockId: string,
  updater: (block: DialogueBlock) => DialogueBlock
): Scene {
  return updateSection(scene, sectionId, (section) => ({
    ...section,
    blocks: section.blocks.map((block) =>
      block.id === blockId && block.type === 'dialogue' ? updater(block) : block
    ),
  }));
}

function updateChoiceBlock(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  updater: (block: ChoiceBlock) => ChoiceBlock
): Scene {
  return updateSection(scene, sectionId, (section) => ({
    ...section,
    blocks: section.blocks.map((block) =>
      block.id === choiceBlockId && block.type === 'choice' ? updater(block) : block
    ),
  }));
}

function updateChoiceOption(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string,
  updater: (option: ChoiceOption) => ChoiceOption
): Scene {
  return updateChoiceBlock(scene, sectionId, choiceBlockId, (block) => ({
    ...block,
    options: block.options.map((option) =>
      option.id === optionId ? updater(option) : option
    ),
  }));
}

function validateChoiceOptionTarget(
  scene: Scene,
  sectionId: string,
  choiceBlockId: string,
  optionId: string,
  targetSectionId: string | null
): SectionEditResult {
  const section = scene.sections.find((candidate) => candidate.id === sectionId);

  if (!section) {
    return { scene, error: 'Section no longer exists.' };
  }

  const choiceBlock = section.blocks.find(
    (block): block is ChoiceBlock => block.id === choiceBlockId && block.type === 'choice'
  );

  if (!choiceBlock) {
    return { scene, error: 'Choice block no longer exists.' };
  }

  if (!choiceBlock.options.some((option) => option.id === optionId)) {
    return { scene, error: 'Choice option no longer exists.' };
  }

  if (
    targetSectionId !== null &&
    !scene.sections.some((candidate) => candidate.id === targetSectionId)
  ) {
    return { scene, error: 'Choice target must be a section in this scene.' };
  }

  const nextScene = updateChoiceOption(
    scene,
    sectionId,
    choiceBlockId,
    optionId,
    (option) => ({
      ...option,
      targetSectionId,
    })
  );

  if (hasSectionGraphCycle(nextScene)) {
    return { scene, error: 'Choice target would create a cycle.' };
  }

  return { scene: nextScene, error: null };
}

function updateSection(
  scene: Scene,
  sectionId: string,
  updater: (section: SceneSection) => SceneSection
): Scene {
  return {
    ...scene,
    sections: scene.sections.map((section) =>
      section.id === sectionId ? updater(section) : section
    ),
  };
}

function replaceSectionAt(
  scene: Scene,
  sectionIndex: number,
  section: SceneSection
): Scene {
  const sections = [...scene.sections];
  sections[sectionIndex] = section;

  return { ...scene, sections };
}

function hasSectionGraphCycle(scene: Scene): boolean {
  const edges = new Map<string, string[]>();

  scene.sections.forEach((section) => {
    const targets: string[] = [];

    if (section.nextSectionId) {
      targets.push(section.nextSectionId);
    }

    section.blocks.forEach((block) => {
      if (block.type !== 'choice') {
        return;
      }

      block.options.forEach((option) => {
        if (option.targetSectionId) {
          targets.push(option.targetSectionId);
        }
      });
    });

    edges.set(section.id, targets);
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (sectionId: string): boolean => {
    if (visiting.has(sectionId)) {
      return true;
    }

    if (visited.has(sectionId)) {
      return false;
    }

    visiting.add(sectionId);

    for (const targetId of edges.get(sectionId) ?? []) {
      if (visit(targetId)) {
        return true;
      }
    }

    visiting.delete(sectionId);
    visited.add(sectionId);
    return false;
  };

  return scene.sections.some((section) => visit(section.id));
}

function createUniqueId(
  scene: Scene,
  prefix: 'choice' | 'line' | 'option' | 'section',
  generateId: () => string
): string {
  const existingIds = new Set<string>();

  scene.sections.forEach((section) => {
    existingIds.add(section.id);
    collectBlockIds(section.blocks, existingIds);
  });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generateId();
    const id = candidate.startsWith(`${prefix}-`) ? candidate : `${prefix}-${candidate}`;

    if (!existingIds.has(id)) {
      return id;
    }
  }

  return `${prefix}-${Date.now()}-${existingIds.size}`;
}

function collectBlockIds(blocks: SceneBlock[], ids: Set<string>): void {
  blocks.forEach((block) => {
    ids.add(block.id);

    if (block.type === 'choice') {
      block.options.forEach((option) => ids.add(option.id));
    }
  });
}

function createTimestampId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
