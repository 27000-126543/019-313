import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { generateMockData } from './mock/data';
import AppHeader from './components/AppHeader';
import PortfolioPanel from './components/PortfolioPanel';
import TimelinePanel from './components/TimelinePanel';
import OpinionPanel from './components/OpinionPanel';
import type { AppData } from './types';

function App() {
  const loadData = useStore((s) => s.loadData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        if (window.electronAPI?.loadData) {
          const savedData = (await window.electronAPI.loadData()) as unknown as AppData;
          if (savedData.companies && savedData.companies.length > 0) {
            loadData(savedData);
          } else {
            loadData(generateMockData());
          }
        } else {
          loadData(generateMockData());
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        loadData(generateMockData());
      }
      setLoaded(true);
    };

    initData();
  }, [loadData]);

  useEffect(() => {
    if (!loaded) return;

    const saveInterval = setInterval(async () => {
      try {
        const data = useStore.getState().getExportData();
        if (window.electronAPI?.saveData) {
          await window.electronAPI.saveData(data);
        }
      } catch (error) {
        console.error('Failed to auto-save data:', error);
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [loaded]);

  if (!loaded) {
    return (
      <div className="app-container">
        <div className="empty-state">
          <div className="empty-state-text">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <AppHeader />
      <div className="main-content">
        <PortfolioPanel />
        <TimelinePanel />
        <OpinionPanel />
      </div>
    </div>
  );
}

export default App;
