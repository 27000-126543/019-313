import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data: unknown) => ipcRenderer.invoke('save-data', data),
  exportReport: (content: string, filename?: string) => ipcRenderer.invoke('export-report', content, filename),
  openPath: (filePath: string) => ipcRenderer.invoke('open-path', filePath),
});

declare global {
  interface Window {
    electronAPI: {
      loadData: () => Promise<Record<string, unknown>>;
      saveData: (data: unknown) => Promise<{ success: boolean }>;
      exportReport: (content: string, filename?: string) => Promise<{ success: boolean; path: string }>;
      openPath: (filePath: string) => Promise<{ success: boolean }>;
    };
  }
}
