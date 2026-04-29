import type {
  Character,
  DialogueLine,
  Scene,
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

const PROJECT_VERSION = 1;
const MAX_CHARACTERS_PER_SCENE = 4;

export function normalizeProject(
  raw: unknown,
  opts: NormalizeProjectOptions
): VicariousProject {
  const now = opts.now ?? new Date().toISOString();
  const source = expectRecord(raw, 'project');
  const version = source.version;

  if (version !== PROJECT_VERSION) {
    throw invalid('project.version must be 1');
  }

  const scenes = readScenes(source.scenes, 'project.scenes');
  const currentSceneId = resolveCurrentSceneId(source.currentSceneId, scenes);
  const isNormalized = hasNormalizedProjectShape(source);

  if (!isNormalized) {
    return {
      version: PROJECT_VERSION,
      id: createId(opts.generateId, 'project'),
      title: opts.fallbackTitle,
      scenes,
      currentSceneId,
      metadata: {
        createdAt: now,
        updatedAt: now,
        appVersion: opts.appVersion,
      },
    };
  }

  const metadata = expectRecord(source.metadata, 'project.metadata');

  return {
    version: PROJECT_VERSION,
    id: readString(source.id, 'project.id'),
    title: readString(source.title, 'project.title', true),
    scenes,
    currentSceneId,
    metadata: {
      createdAt: readString(metadata.createdAt, 'project.metadata.createdAt'),
      updatedAt: readString(metadata.updatedAt, 'project.metadata.updatedAt'),
      appVersion: readString(metadata.appVersion, 'project.metadata.appVersion'),
    },
  };
}

export function createBlankProject(
  opts: CreateBlankProjectOptions
): VicariousProject {
  const now = opts.now ?? new Date().toISOString();
  const projectId = createId(opts.generateId, 'project');
  const sceneId = createId(opts.generateId, 'scene');
  const firstCharacterId = createId(opts.generateId, 'character');
  const secondCharacterId = createId(opts.generateId, 'character');
  const lineId = createId(opts.generateId, 'line');

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
        lines: [{ id: lineId, characterId: firstCharacterId, text: '' }],
      },
    ],
    metadata: {
      createdAt: now,
      updatedAt: now,
      appVersion: opts.appVersion,
    },
  };
}

function hasNormalizedProjectShape(source: UnknownRecord): boolean {
  return (
    typeof source.id !== 'undefined' ||
    typeof source.title !== 'undefined' ||
    typeof source.metadata !== 'undefined'
  );
}

function readScenes(value: unknown, path: string): Scene[] {
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

    return {
      id,
      name: readString(record.name, `${scenePath}.name`, true),
      lines: readLines(record.lines, `${scenePath}.lines`),
      characters: readCharacters(record.characters, `${scenePath}.characters`),
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

function readLines(value: unknown, path: string): DialogueLine[] {
  if (!Array.isArray(value)) {
    throw invalid(`${path} must be an array`);
  }

  const lineIds = new Set<string>();

  return value.map((line, index) => {
    const linePath = `${path}[${index}]`;
    const record = expectRecord(line, linePath);
    const id = readString(record.id, `${linePath}.id`);
    const isHeader = record.isHeader;

    if (lineIds.has(id)) {
      throw invalid(`${linePath}.id must be unique within the scene`);
    }
    lineIds.add(id);

    if (typeof isHeader !== 'undefined' && typeof isHeader !== 'boolean') {
      throw invalid(`${linePath}.isHeader must be a boolean when present`);
    }

    return {
      id,
      characterId: readString(record.characterId, `${linePath}.characterId`),
      text: readString(record.text, `${linePath}.text`, true),
      ...(typeof isHeader === 'boolean' ? { isHeader } : {}),
    };
  });
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
