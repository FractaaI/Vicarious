import type { RecoveryFile, VicariousProject } from './projectTypes';

export const IPC_CHANNELS = {
  projectOpen: 'project:open',
  projectSave: 'project:save',
  projectSaveAs: 'project:save-as',
  projectExportMarkdown: 'project:export-md',
  dialogConfirmUnsaved: 'dialog:confirm-unsaved',
  recoveryWrite: 'recovery:write',
  recoveryRead: 'recovery:read',
  recoveryDiscard: 'recovery:discard',
  appCloseApproved: 'app:close-approved',
  menuNew: 'menu:new',
  menuOpen: 'menu:open',
  menuSave: 'menu:save',
  menuSaveAs: 'menu:save-as',
  menuExportMarkdown: 'menu:export-md',
  appRequestClose: 'app:request-close',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface ProjectOpenResponse {
  project: VicariousProject;
  filePath: string;
}

export interface ProjectSaveRequest {
  project: VicariousProject;
  filePath: string;
}

export interface ProjectSaveResponse {
  ok: true;
  project: VicariousProject;
  filePath: string;
}

export interface ProjectSaveAsRequest {
  project: VicariousProject;
}

export type ProjectSaveAsResponse = ProjectSaveResponse | null;

export interface ProjectExportMarkdownRequest {
  markdown: string;
  suggestedName: string;
}

export interface ProjectExportMarkdownResponse {
  ok: true;
  filePath: string;
}

export type ConfirmUnsavedResponse = 'save' | 'discard' | 'cancel';

export interface RecoveryWriteRequest {
  project: VicariousProject;
  filePath: string | null;
  isDirty: boolean;
}

export type Unsubscribe = () => void;
export type VoidListener = () => void;

export interface DesktopApi {
  openProject: () => Promise<ProjectOpenResponse | null>;
  saveProject: (
    project: VicariousProject,
    filePath: string
  ) => Promise<ProjectSaveResponse>;
  saveProjectAs: (project: VicariousProject) => Promise<ProjectSaveAsResponse>;
  exportMarkdown: (
    markdown: string,
    suggestedName: string
  ) => Promise<ProjectExportMarkdownResponse | null>;
  confirmUnsavedChanges: () => Promise<ConfirmUnsavedResponse>;
  writeRecovery: (
    project: VicariousProject,
    filePath: string | null,
    isDirty: boolean
  ) => Promise<void>;
  readRecovery: () => Promise<RecoveryFile | null>;
  discardRecovery: () => Promise<void>;
  approveClose: () => Promise<void>;
  onMenuNew: (cb: VoidListener) => Unsubscribe;
  onMenuOpen: (cb: VoidListener) => Unsubscribe;
  onMenuSave: (cb: VoidListener) => Unsubscribe;
  onMenuSaveAs: (cb: VoidListener) => Unsubscribe;
  onMenuExport: (cb: VoidListener) => Unsubscribe;
  onRequestClose: (cb: VoidListener) => Unsubscribe;
}
