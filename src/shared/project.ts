import type {
  Character,
  ChoiceBlock,
  ChoiceOption,
  DialogueBlock,
  Scene,
  SceneBlock,
  SceneSection,
  VicariousProject,
} from './projectTypes';

export interface NormalizeProjectOptions {
  fallbackTitle: string;
  appVersion: string;
  now?: string;
  generateId?: () => string;
}

export interface CreateBlankProjectOptions {
  title?: string;
  appVersion: string;
  now?: string;
  generateId?: () => string;
}

export class ProjectNormalizationError extends Error {
  readonly code = 'PROJECT_NORMALIZATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ProjectNormalizationError';
  }
}

type UnknownRecord = Record<string, unknown>;
type RawProjectVersion = 1 | 2;

const PROJECT_VERSION = 2;
const MAX_CHARACTERS_PER_SCENE = 4;

export function normalizeProject(
  raw: unknown,
  opts: NormalizeProjectOptions
): VicariousProject {
  const now = opts.now ?? new Date().toISOString();
  const source = expectRecord(raw, 'project');
  const version = readProjectVersion(source.version, source.scenes);
  const scenes = readScenes(source.scenes, 'project.scenes', version);
  const currentSceneId = resolveCurrentSceneId(source.currentSceneId, scenes);
  const metadata = readMetadata(source.metadata, opts.appVersion, now);

  return {
    version: PROJECT_VERSION,
    id: readOptionalString(source.id, 'project.id') ?? createId(opts.generateId, 'project'),
    title: readOptionalString(source.title, 'project.title', true) ?? opts.fallbackTitle,
    scenes,
    currentSceneId,
    metadata,
  };
}

export function createBlankProject(
  opts: CreateBlankProjectOptions
): VicariousProject {
  const now = opts.now ?? new Date().toISOString();
  const projectId = createId(opts.generateId, 'project');
  const sceneId = createId(opts.generateId, 'scene');
  const sectionId = `${sceneId}-section-main`;
  const firstCharacterId = createId(opts.generateId, 'character');
  const secondCharacterId = createId(opts.generateId, 'character');
  const blockId = createId(opts.generateId, 'line');

  return {
    version: PROJECT_VERSION,
    id: projectId,
    title: opts.title ?? 'Untitled Project',
    currentSceneId: sceneId,
    scenes: [
      {
        id: sceneId,
        name: 'Scene 1',
        characters: [
          { id: firstCharacterId, name: 'Character 1', color: '#ef4444' },
          { id: secondCharacterId, name: 'Character 2', color: '#3b82f6' },
        ],
        sections: [
          {
            id: sectionId,
            name: 'Scene 1',
            blocks: [
              {
                id: blockId,
                type: 'dialogue',
                characterId: firstCharacterId,
                text: '',
              },
            ],
            nextSectionId: null,
          },
        ],
      },
    ],
    metadata: {
      createdAt: now,
      updatedAt: now,
      appVersion: opts.appVersion,
    },
  };
}

function readProjectVersion(value: unknown, scenes: unknown): RawProjectVersion {
  if (value === 1 || value === 2) {
    return value;
  }

  if (typeof value === 'undefined' && looksLikeLegacyV1Scenes(scenes)) {
    return 1;
  }

  throw invalid('project.version must be 1 or 2');
}

function looksLikeLegacyV1Scenes(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some((scene) => isRecord(scene) && Array.isArray(scene.lines))
  );
}

function readMetadata(
  value: unknown,
  appVersion: string,
  now: string
): VicariousProject['metadata'] {
  if (typeof value === 'undefined') {
    return {
      createdAt: now,
      updatedAt: now,
      appVersion,
    };
  }

  const metadata = expectRecord(value, 'project.metadata');

  return {
    createdAt: readOptionalString(metadata.createdAt, 'project.metadata.createdAt') ?? now,
    updatedAt: readOptionalString(metadata.updatedAt, 'project.metadata.updatedAt') ?? now,
    appVersion:
      readOptionalString(metadata.appVersion, 'project.metadata.appVersion') ?? appVersion,
  };
}

function readScenes(value: unknown, path: string, version: RawProjectVersion): Scene[] {
  if (!Array.isArray(value)) {
    throw invalid(`${path} must be an array`);
  }

  if (value.length === 0) {
    throw invalid(`${path} must contain at least one scene`);
  }

  const sceneIds = new Set<string>();

  return value.map((scene, index) => {
    const scenePath = `${path}[${index}]`;
    const record = expectRecord(scene, scenePath);
    const id = readString(record.id, `${scenePath}.id`);

    if (sceneIds.has(id)) {
      throw invalid(`${scenePath}.id must be unique`);
    }
    sceneIds.add(id);

    const name = readString(record.name, `${scenePath}.name`, true);
    const characters = readCharacters(record.characters, `${scenePath}.characters`);
    const sections =
      version === 1
        ? migrateLinesToSection(record.lines, `${scenePath}.lines`, id, name, characters)
        : readSections(record.sections, `${scenePath}.sections`, characters);

    validateSceneGraph(sections, scenePath);

    return {
      id,
      name,
      characters,
      sections,
    };
  });
}

function readCharacters(value: unknown, path: string): Character[] {
  if (!Array.isArray(value)) {
    throw invalid(`${path} must be an array`);
  }

  if (value.length === 0) {
    throw invalid(`${path} must contain at least one character`);
  }

  if (value.length > MAX_CHARACTERS_PER_SCENE) {
    throw invalid(`${path} cannot contain more than ${MAX_CHARACTERS_PER_SCENE} characters`);
  }

  const characterIds = new Set<string>();

  return value.map((character, index) => {
    const characterPath = `${path}[${index}]`;
    const record = expectRecord(character, characterPath);
    const id = readString(record.id, `${characterPath}.id`);

    if (characterIds.has(id)) {
      throw invalid(`${characterPath}.id must be unique within the scene`);
    }
    characterIds.add(id);

    return {
      id,
      name: readString(record.name, `${characterPath}.name`, true),
      color: readString(record.color, `${characterPath}.color`),
    };
  });
}

function migrateLinesToSection(
  value: unknown,
  path: string,
  sceneId: string,
  sceneName: string,
  characters: Character[]
): SceneSection[] {
  return [
    {
      id: `${sceneId}-section-main`,
      name: sceneName.trim() || 'Main',
      blocks: readDialogueBlocks(value, path, characters),
      nextSectionId: null,
    },
  ];
}

function readSections(
  value: unknown,
  path: string,
  characters: Character[]
): SceneSection[] {
  if (!Array.isArray(value)) {
    throw invalid(`${path} must be an array`);
  }

  if (value.length === 0) {
    throw invalid(`${path} must contain at least one section`);
  }

  const sectionIds = new Set<string>();
  const blockIds = new Set<string>();

  return value.map((section, sectionIndex) => {
    const sectionPath = `${path}[${sectionIndex}]`;
    const record = expectRecord(section, sectionPath);
    const id = readString(record.id, `${sectionPath}.id`);

    if (sectionIds.has(id)) {
      throw invalid(`${sectionPath}.id must be unique within the scene`);
    }
    sectionIds.add(id);

    const blocks = readBlocks(record.blocks, `${sectionPath}.blocks`, characters, blockIds);

    return {
      id,
      name: readString(record.name, `${sectionPath}.name`, true),
      blocks,
      nextSectionId: readNullableString(
        record.nextSectionId,
        `${sectionPath}.nextSectionId`
      ),
    };
  });
}

function readBlocks(
  value: unknown,
  path: string,
  characters: Character[],
  blockIds: Set<string>
): SceneBlock[] {
  if (!Array.isArray(value)) {
    throw invalid(`${path} must be an array`);
  }

  return value.map((block, index) => {
    const blockPath = `${path}[${index}]`;
    const record = expectRecord(block, blockPath);
    const id = readString(record.id, `${blockPath}.id`);

    if (blockIds.has(id)) {
      throw invalid(`${blockPath}.id must be unique within the scene`);
    }
    blockIds.add(id);

    if (record.type === 'dialogue') {
      return readDialogueBlockRecord(record, blockPath, id, characters);
    }

    if (record.type === 'choice') {
      return readChoiceBlockRecord(record, blockPath, id, characters);
    }

    throw invalid(`${blockPath}.type must be "dialogue" or "choice"`);
  });
}

function readDialogueBlocks(
  value: unknown,
  path: string,
  characters: Character[]
): DialogueBlock[] {
  if (!Array.isArray(value)) {
    throw invalid(`${path} must be an array`);
  }

  const blockIds = new Set<string>();

  return value.map((line, index) => {
    const linePath = `${path}[${index}]`;
    const record = expectRecord(line, linePath);
    const id = readString(record.id, `${linePath}.id`);

    if (blockIds.has(id)) {
      throw invalid(`${linePath}.id must be unique within the scene`);
    }
    blockIds.add(id);

    return readDialogueBlockRecord(record, linePath, id, characters);
  });
}

function readDialogueBlockRecord(
  record: UnknownRecord,
  path: string,
  id: string,
  characters: Character[]
): DialogueBlock {
  const isHeader = record.isHeader;
  const characterId = readString(record.characterId, `${path}.characterId`);

  if (!characters.some((character) => character.id === characterId)) {
    throw invalid(`${path}.characterId must refer to a scene character`);
  }

  if (typeof isHeader !== 'undefined' && typeof isHeader !== 'boolean') {
    throw invalid(`${path}.isHeader must be a boolean when present`);
  }

  return {
    id,
    type: 'dialogue',
    characterId,
    text: readString(record.text, `${path}.text`, true),
    ...(typeof isHeader === 'boolean' ? { isHeader } : {}),
  };
}

function readChoiceBlockRecord(
  record: UnknownRecord,
  path: string,
  id: string,
  characters: Character[]
): ChoiceBlock {
  if (!Array.isArray(record.options)) {
    throw invalid(`${path}.options must be an array`);
  }

  const optionIds = new Set<string>();
  const options = record.options.map((option, index) => {
    const optionPath = `${path}.options[${index}]`;
    const optionRecord = expectRecord(option, optionPath);
    const optionId = readString(optionRecord.id, `${optionPath}.id`);
    const characterId = readString(optionRecord.characterId, `${optionPath}.characterId`);

    if (optionIds.has(optionId)) {
      throw invalid(`${optionPath}.id must be unique within the choice block`);
    }
    optionIds.add(optionId);

    if (!characters.some((character) => character.id === characterId)) {
      throw invalid(`${optionPath}.characterId must refer to a scene character`);
    }

    return {
      id: optionId,
      characterId,
      text: readString(optionRecord.text, `${optionPath}.text`, true),
      targetSectionId: readNullableString(
        optionRecord.targetSectionId,
        `${optionPath}.targetSectionId`
      ),
    } satisfies ChoiceOption;
  });

  return {
    id,
    type: 'choice',
    options,
  };
}

function validateSceneGraph(sections: SceneSection[], scenePath: string): void {
  const sectionIds = new Set(sections.map((section) => section.id));
  const edges = new Map<string, string[]>();

  sections.forEach((section, sectionIndex) => {
    const sectionPath = `${scenePath}.sections[${sectionIndex}]`;
    const targets: string[] = [];

    if (section.nextSectionId !== null) {
      if (!sectionIds.has(section.nextSectionId)) {
        throw invalid(`${sectionPath}.nextSectionId must refer to a section in the same scene`);
      }
      targets.push(section.nextSectionId);
    }

    section.blocks.forEach((block, blockIndex) => {
      if (block.type !== 'choice') {
        return;
      }

      block.options.forEach((option, optionIndex) => {
        if (option.targetSectionId === null) {
          return;
        }

        if (!sectionIds.has(option.targetSectionId)) {
          throw invalid(
            `${sectionPath}.blocks[${blockIndex}].options[${optionIndex}].targetSectionId must refer to a section in the same scene`
          );
        }

        targets.push(option.targetSectionId);
      });
    });

    edges.set(section.id, targets);
  });

  rejectSectionGraphCycles(edges, scenePath);
}

function rejectSectionGraphCycles(
  edges: Map<string, string[]>,
  scenePath: string
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (sectionId: string, path: string[]): void => {
    if (visiting.has(sectionId)) {
      throw invalid(
        `${scenePath}.sections must not contain cycles (${[...path, sectionId].join(' -> ')})`
      );
    }

    if (visited.has(sectionId)) {
      return;
    }

    visiting.add(sectionId);
    edges.get(sectionId)?.forEach((targetId) => visit(targetId, [...path, sectionId]));
    visiting.delete(sectionId);
    visited.add(sectionId);
  };

  edges.forEach((_targets, sectionId) => visit(sectionId, []));
}

function resolveCurrentSceneId(value: unknown, scenes: Scene[]): string {
  if (typeof value === 'string' && scenes.some((scene) => scene.id === value)) {
    return value;
  }

  return scenes[0].id;
}

function expectRecord(value: unknown, path: string): UnknownRecord {
  if (!isRecord(value)) {
    throw invalid(`${path} must be an object`);
  }

  return value;
}

function readString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string') {
    throw invalid(`${path} must be a string`);
  }

  if (!allowEmpty && value.trim() === '') {
    throw invalid(`${path} must not be empty`);
  }

  return value;
}

function readOptionalString(
  value: unknown,
  path: string,
  allowEmpty = false
): string | null {
  if (typeof value === 'undefined') {
    return null;
  }

  return readString(value, path, allowEmpty);
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null) {
    return null;
  }

  return readString(value, path);
}

function createId(generateId: (() => string) | undefined, prefix: string): string {
  const id = generateId?.() ?? `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

  if (id.trim() === '') {
    throw invalid(`generated ${prefix} id must not be empty`);
  }

  return id;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(message: string): ProjectNormalizationError {
  return new ProjectNormalizationError(`Invalid Vicarious project: ${message}.`);
}
