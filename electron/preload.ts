import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data: unknown) => ipcRenderer.invoke('save-data', data),
  exportReport: (content: string) => ipcRenderer.invoke('export-report', content),
});

declare global {
  interface Window {
    electronAPI: {
      loadData: () => Promise<Record<string, unknown>>;
      saveData: (data: unknown) => Promise<{ success: boolean }>;
      exportReport: (content: string) => Promise<{ success: boolean; path: string }>;
    };
  }
}
