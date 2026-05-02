import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import {
  IPC_CHANNELS,
  type IpcChannel,
  type ProjectExportMarkdownRequest,
  type ProjectSaveAsRequest,
  type ProjectSaveRequest,
  type RecoveryWriteRequest,
} from '../shared/ipc';
import { normalizeProject } from '../shared/project';
import type { RecoveryFile, VicariousProject } from '../shared/projectTypes';

let mainWindow: BrowserWindow | null = null;
let recoveryOperationQueue: Promise<void> = Promise.resolve();

const vicariousFileFilters = [
  { name: 'Vicarious Project', extensions: ['vicarious'] },
];
const markdownFileFilters = [{ name: 'Markdown', extensions: ['md'] }];
const recoveryFileName = 'recovery.vicarious';

type UnknownRecord = Record<string, unknown>;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{ role: 'appMenu' } satisfies MenuItemConstructorOptions]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendMenuEvent(IPC_CHANNELS.menuNew),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendMenuEvent(IPC_CHANNELS.menuOpen),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendMenuEvent(IPC_CHANNELS.menuSave),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendMenuEvent(IPC_CHANNELS.menuSaveAs),
        },
        { type: 'separator' },
        {
          label: 'Export Scene as Markdown...',
          click: () => sendMenuEvent(IPC_CHANNELS.menuExportMarkdown),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendMenuEvent(channel: IpcChannel): void {
  BrowserWindow.getFocusedWindow()?.webContents.send(channel);
}

ipcMain.handle(IPC_CHANNELS.projectOpen, async () => {
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, {
        title: 'Open Vicarious Project',
        properties: ['openFile'],
        filters: vicariousFileFilters,
      })
    : await dialog.showOpenDialog({
        title: 'Open Vicarious Project',
        properties: ['openFile'],
        filters: vicariousFileFilters,
      });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fallbackTitle = titleFromFilePath(filePath);
  const contents = await readFile(filePath, 'utf8');
  const raw = parseProjectJson(contents);
  const project = normalizeProject(raw, {
    fallbackTitle,
    appVersion: app.getVersion(),
  });

  return { project, filePath };
});

ipcMain.handle(IPC_CHANNELS.projectSave, async (_event, payload) => {
  const request = validateProjectSaveRequest(payload);
  const project = stampProject(
    normalizeProject(request.project, {
      fallbackTitle: titleFromProjectOrPath(request.project, request.filePath),
      appVersion: app.getVersion(),
    })
  );

  await writeJsonAtomic(request.filePath, project);
  await enqueueRecoveryOperation(discardRecoveryFileQuietly);

  return { ok: true, project, filePath: request.filePath };
});

ipcMain.handle(IPC_CHANNELS.projectSaveAs, async (_event, payload) => {
  const request = validateProjectSaveAsRequest(payload);
  const normalizedProject = normalizeProject(request.project, {
    fallbackTitle: titleFromProjectOrPath(request.project, null),
    appVersion: app.getVersion(),
  });

  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, {
        title: 'Save Vicarious Project',
        defaultPath: `${safeFileName(normalizedProject.title)}.vicarious`,
        filters: vicariousFileFilters,
      })
    : await dialog.showSaveDialog({
        title: 'Save Vicarious Project',
        defaultPath: `${safeFileName(normalizedProject.title)}.vicarious`,
        filters: vicariousFileFilters,
      });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = ensureVicariousExtension(result.filePath);
  const project = stampProject(normalizedProject);

  await writeJsonAtomic(filePath, project);
  await enqueueRecoveryOperation(discardRecoveryFileQuietly);

  return { ok: true, project, filePath };
});

ipcMain.handle(IPC_CHANNELS.projectExportMarkdown, async (event, payload) => {
  const request = validateProjectExportMarkdownRequest(payload);
  const owner = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
  const options = {
    title: 'Export Scene as Markdown',
    defaultPath: `${safeFileName(request.suggestedName, 'Untitled Scene')}.md`,
    filters: markdownFileFilters,
  };

  const result = owner
    ? await dialog.showSaveDialog(owner, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = ensureMarkdownExtension(result.filePath);

  await writeTextAtomic(filePath, request.markdown);

  return { ok: true, filePath };
});

ipcMain.handle(IPC_CHANNELS.dialogConfirmUnsaved, async (event) => {
  const owner = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
  const options = {
    type: 'warning' as const,
    buttons: ['Save', 'Discard', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Changes',
    message: 'Do you want to save changes before continuing?',
    detail: 'Your unsaved changes will be lost if you discard them.',
    noLink: true,
  };

  const result = owner
    ? await dialog.showMessageBox(owner, options)
    : await dialog.showMessageBox(options);

  if (result.response === 0) {
    return 'save';
  }

  if (result.response === 1) {
    return 'discard';
  }

  return 'cancel';
});

ipcMain.handle(IPC_CHANNELS.recoveryWrite, async (_event, payload) => {
  await enqueueRecoveryOperation(async () => {
    try {
      const request = validateRecoveryWriteRequest(payload);

      if (!request.isDirty) {
        await discardRecoveryFileQuietly();
        return;
      }

      const project = normalizeProject(request.project, {
        fallbackTitle: titleFromProjectOrPath(request.project, request.filePath),
        appVersion: app.getVersion(),
      });
      const recovery: RecoveryFile = {
        version: 1,
        savedAt: new Date().toISOString(),
        filePath: request.filePath,
        isDirty: true,
        project,
      };

      await writeJsonAtomic(getRecoveryFilePath(), recovery);
    } catch (error) {
      console.warn('Failed to write recovery file.', error);
    }
  });
});

ipcMain.handle(IPC_CHANNELS.recoveryRead, async () => {
  const recoveryFilePath = getRecoveryFilePath();
  let contents: string;

  try {
    contents = await readFile(recoveryFilePath, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return null;
    }

    console.warn('Failed to read recovery file.', error);
    return null;
  }

  try {
    const recovery = validateRecoveryFile(parseProjectJson(contents));

    if (recovery.isDirty !== true) {
      await discardRecoveryFileQuietly();
      return null;
    }

    return recovery;
  } catch (error) {
    console.warn('Discarding invalid recovery file.', error);
    await discardRecoveryFileQuietly();
    return null;
  }
});

ipcMain.handle(IPC_CHANNELS.recoveryDiscard, async () => {
  await enqueueRecoveryOperation(discardRecoveryFileQuietly);
});

function validateProjectSaveRequest(payload: unknown): ProjectSaveRequest {
  const record = expectRecord(payload, 'project:save payload');

  return {
    project: record.project as VicariousProject,
    filePath: readRequiredString(record.filePath, 'project:save filePath'),
  };
}

function validateProjectSaveAsRequest(payload: unknown): ProjectSaveAsRequest {
  const record = expectRecord(payload, 'project:save-as payload');

  if (!('project' in record)) {
    throw new Error('Invalid project: project:save-as payload must include project.');
  }

  return {
    project: record.project as VicariousProject,
  };
}

function validateProjectExportMarkdownRequest(
  payload: unknown
): ProjectExportMarkdownRequest {
  const record = expectRecord(payload, 'project:export-md payload');

  return {
    markdown: readString(record.markdown, 'project:export-md markdown'),
    suggestedName: readString(
      record.suggestedName,
      'project:export-md suggestedName'
    ),
  };
}

function validateRecoveryWriteRequest(payload: unknown): RecoveryWriteRequest {
  const record = expectRecord(payload, 'recovery:write payload');

  if (!('project' in record)) {
    throw new Error('Invalid project: recovery:write payload must include project.');
  }

  return {
    project: record.project as VicariousProject,
    filePath: readNullableString(record.filePath, 'recovery:write filePath'),
    isDirty: readBoolean(record.isDirty, 'recovery:write isDirty'),
  };
}

function validateRecoveryFile(raw: unknown): RecoveryFile {
  const record = expectRecord(raw, 'recovery file');

  if (record.version !== 1) {
    throw new Error('Invalid recovery file: version must be 1.');
  }

  const filePath = readNullableString(record.filePath, 'recovery filePath');

  if (!('project' in record)) {
    throw new Error('Invalid recovery file: project is required.');
  }

  return {
    version: 1,
    savedAt: readRequiredString(record.savedAt, 'recovery savedAt'),
    filePath,
    isDirty: readBoolean(record.isDirty, 'recovery isDirty'),
    project: normalizeProject(record.project, {
      fallbackTitle: titleFromProjectOrPath(record.project, filePath),
      appVersion: app.getVersion(),
    }),
  };
}

function stampProject(project: VicariousProject): VicariousProject {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      updatedAt: new Date().toISOString(),
      appVersion: app.getVersion(),
    },
  };
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const targetDirectory = dirname(filePath);
  const temporaryPath = join(
    targetDirectory,
    `.${basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  const json = `${JSON.stringify(value, null, 2)}\n`;

  await mkdir(targetDirectory, { recursive: true });

  try {
    await writeFile(temporaryPath, json, 'utf8');
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function writeTextAtomic(filePath: string, contents: string): Promise<void> {
  const targetDirectory = dirname(filePath);
  const temporaryPath = join(
    targetDirectory,
    `.${basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  await mkdir(targetDirectory, { recursive: true });

  try {
    await writeFile(temporaryPath, contents, 'utf8');
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function discardRecoveryFileQuietly(): Promise<void> {
  try {
    await unlink(getRecoveryFilePath());
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return;
    }

    console.warn('Failed to discard recovery file.', error);
  }
}

function getRecoveryFilePath(): string {
  return join(app.getPath('userData'), recoveryFileName);
}

function enqueueRecoveryOperation(operation: () => Promise<void>): Promise<void> {
  const nextOperation = recoveryOperationQueue
    .catch(() => undefined)
    .then(operation);

  recoveryOperationQueue = nextOperation.catch(() => undefined);

  return nextOperation;
}

function parseProjectJson(contents: string): unknown {
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error('Invalid Vicarious project: file is not valid JSON.');
  }
}

function titleFromProjectOrPath(
  project: unknown,
  filePath: string | null
): string {
  if (isRecord(project) && typeof project.title === 'string' && project.title.trim()) {
    return project.title;
  }

  return filePath ? titleFromFilePath(filePath) : 'Untitled Project';
}

function titleFromFilePath(filePath: string): string {
  return basename(filePath, extname(filePath)) || 'Untitled Project';
}

function ensureVicariousExtension(filePath: string): string {
  return extname(filePath).toLowerCase() === '.vicarious'
    ? filePath
    : `${filePath}.vicarious`;
}

function ensureMarkdownExtension(filePath: string): string {
  return extname(filePath).toLowerCase() === '.md' ? filePath : `${filePath}.md`;
}

function safeFileName(value: string, fallback = 'Untitled Project'): string {
  const name = value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  return name || fallback;
}

function expectRecord(value: unknown, name: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new Error(`Invalid project: ${name} must be an object.`);
  }

  return value;
}

function readRequiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid project: ${name} must be a non-empty string.`);
  }

  return value;
}

function readString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid project: ${name} must be a string.`);
  }

  return value;
}

function readNullableString(value: unknown, name: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid project: ${name} must be a string or null.`);
  }

  return value;
}

function readBoolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid project: ${name} must be a boolean.`);
  }

  return value;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
