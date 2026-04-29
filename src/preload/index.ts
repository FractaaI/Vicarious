import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type DesktopApi, type VoidListener } from '../shared/ipc';

function subscribe(channel: string, cb: VoidListener): () => void {
  const listener = (): void => cb();

  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api: DesktopApi = {
  openProject: () => ipcRenderer.invoke(IPC_CHANNELS.projectOpen),

  saveProject: (project, filePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectSave, { project, filePath }),

  saveProjectAs: (project) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectSaveAs, { project }),

  exportMarkdown: (markdown, suggestedName) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectExportMarkdown, {
      markdown,
      suggestedName,
    }),

  confirmUnsavedChanges: () =>
    ipcRenderer.invoke(IPC_CHANNELS.dialogConfirmUnsaved),

  writeRecovery: (project, filePath, isDirty) =>
    ipcRenderer.invoke(IPC_CHANNELS.recoveryWrite, {
      project,
      filePath,
      isDirty,
    }),

  readRecovery: () => ipcRenderer.invoke(IPC_CHANNELS.recoveryRead),

  discardRecovery: () => ipcRenderer.invoke(IPC_CHANNELS.recoveryDiscard),

  approveClose: () => ipcRenderer.invoke(IPC_CHANNELS.appCloseApproved),

  onMenuNew: (cb) => subscribe(IPC_CHANNELS.menuNew, cb),

  onMenuOpen: (cb) => subscribe(IPC_CHANNELS.menuOpen, cb),

  onMenuSave: (cb) => subscribe(IPC_CHANNELS.menuSave, cb),

  onMenuSaveAs: (cb) => subscribe(IPC_CHANNELS.menuSaveAs, cb),

  onMenuExport: (cb) => subscribe(IPC_CHANNELS.menuExportMarkdown, cb),

  onRequestClose: (cb) => subscribe(IPC_CHANNELS.appRequestClose, cb),
};

contextBridge.exposeInMainWorld('api', api);
