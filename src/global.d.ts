export {};

declare global {
  interface Window {
    electronAPI: {
      loadData: () => Promise<Record<string, unknown>>;
      saveData: (data: unknown) => Promise<{ success: boolean }>;
      exportReport: (content: string) => Promise<{ success: boolean; path: string }>;
    };
  }
}
