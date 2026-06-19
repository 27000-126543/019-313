import { create } from 'zustand';
import type { AppData, Company, NewsItem, Event, Opinion, EventConclusion, ExportRecord, ExportType } from '../types';

export type MorningFilterMode =
  | 'off'
  | 'all'
  | 'core_portfolio'
  | 'negative_sentiment'
  | 'need_verify'
  | 'risk_warning'
  | `portfolio:${string}`;

interface StoreState extends AppData {
  selectedCompanyId: string | null;
  selectedEventId: string | null;
  selectedNewsId: string | null;
  currentDate: string;
  filterPortfolio: string | null;
  filterIndustry: string | null;
  filterImportance: string | null;
  isMorningFilter: boolean;
  morningFilterMode: MorningFilterMode;
  setSelectedCompany: (id: string | null) => void;
  setSelectedEvent: (id: string | null) => void;
  setSelectedNews: (id: string | null) => void;
  setCurrentDate: (date: string) => void;
  setFilterPortfolio: (filter: string | null) => void;
  setFilterIndustry: (filter: string | null) => void;
  setFilterImportance: (filter: string | null) => void;
  setMorningFilterMode: (mode: MorningFilterMode) => void;
  toggleMorningFilter: () => void;
  addCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
  deleteCompany: (id: string) => void;
  addNews: (news: NewsItem) => void;
  updateNews: (news: NewsItem) => void;
  mergeNewsToEvent: (newsIds: string[], eventTitle: string, companyId: string) => void;
  addNewsToEvent: (newsId: string, eventId: string) => void;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  updateEventConclusion: (eventId: string, conclusion: EventConclusion) => void;
  addOpinion: (opinion: Opinion) => void;
  updateOpinion: (opinion: Opinion) => void;
  deleteOpinion: (id: string) => void;
  addExportRecord: (record: Omit<ExportRecord, 'id'>) => void;
  clearExportHistory: () => void;
  loadData: (data: AppData) => void;
  getExportData: () => AppData;
}

const initialState: AppData = {
  companies: [],
  news: [],
  events: [],
  opinions: [],
  exportHistory: [],
};

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  selectedCompanyId: null,
  selectedEventId: null,
  selectedNewsId: null,
  currentDate: new Date().toISOString().split('T')[0],
  filterPortfolio: null,
  filterIndustry: null,
  filterImportance: null,
  isMorningFilter: false,
  morningFilterMode: 'all',

  setSelectedCompany: (id) => set({ selectedCompanyId: id, selectedEventId: null, selectedNewsId: null }),
  setSelectedEvent: (id) => set({ selectedEventId: id, selectedNewsId: null }),
  setSelectedNews: (id) => set({ selectedNewsId: id }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setFilterPortfolio: (filter) => set({ filterPortfolio: filter }),
  setFilterIndustry: (filter) => set({ filterIndustry: filter }),
  setFilterImportance: (filter) => set({ filterImportance: filter }),
  setMorningFilterMode: (mode) =>
    set({
      morningFilterMode: mode,
      isMorningFilter: mode !== 'off',
    }),
  toggleMorningFilter: () =>
    set((s) => ({
      isMorningFilter: !s.isMorningFilter,
      morningFilterMode: s.isMorningFilter ? 'off' : 'all',
    })),

  addCompany: (company) => set((s) => ({ companies: [...s.companies, company] })),
  updateCompany: (company) =>
    set((s) => ({ companies: s.companies.map((c) => (c.id === company.id ? company : c)) })),
  deleteCompany: (id) =>
    set((s) => ({
      companies: s.companies.filter((c) => c.id !== id),
      news: s.news.filter((n) => n.companyId !== id),
      events: s.events.filter((e) => e.companyId !== id),
      opinions: s.opinions.filter((o) => o.companyId !== id),
      selectedCompanyId: s.selectedCompanyId === id ? null : s.selectedCompanyId,
    })),

  addNews: (news) => set((s) => ({ news: [...s.news, news] })),
  updateNews: (news) =>
    set((s) => ({ news: s.news.map((n) => (n.id === news.id ? news : n)) })),

  mergeNewsToEvent: (newsIds, eventTitle, companyId) => {
    const state = get();
    const relatedNews = state.news.filter((n) => newsIds.includes(n.id));
    if (relatedNews.length === 0) return;

    const eventId = `event_${Date.now()}`;
    const sentiments = relatedNews.map((n) => n.sentiment);
    const sentiment = sentiments.includes('negative')
      ? 'negative'
      : sentiments.includes('positive')
      ? 'positive'
      : 'neutral';

    const newEvent: Event = {
      id: eventId,
      title: eventTitle,
      companyId,
      newsIds,
      startTime: new Date(Math.min(...relatedNews.map((n) => new Date(n.publishTime).getTime()))).toISOString(),
      endTime: new Date(Math.max(...relatedNews.map((n) => new Date(n.publishTime).getTime()))).toISOString(),
      sentiment,
      tags: [...new Set(relatedNews.flatMap((n) => n.tags))],
      importance: 'medium',
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      events: [...s.events, newEvent],
      news: s.news.map((n) => (newsIds.includes(n.id) ? { ...n, eventId } : n)),
      selectedEventId: eventId,
    }));
  },

  addNewsToEvent: (newsId, eventId) => {
    const state = get();
    const newsItem = state.news.find((n) => n.id === newsId);
    const event = state.events.find((e) => e.id === eventId);
    if (!newsItem || !event) return;
    if (newsItem.companyId !== event.companyId) return;

    const newNewsIds = event.newsIds.includes(newsId) ? event.newsIds : [...event.newsIds, newsId];
    const relatedNews = state.news.filter((n) => newNewsIds.includes(n.id));

    const sentiments = relatedNews.map((n) => n.sentiment);
    const sentiment = sentiments.includes('negative')
      ? 'negative'
      : sentiments.includes('positive')
      ? 'positive'
      : 'neutral';

    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              newsIds: newNewsIds,
              startTime: new Date(
                Math.min(...relatedNews.map((n) => new Date(n.publishTime).getTime()))
              ).toISOString(),
              endTime: new Date(
                Math.max(...relatedNews.map((n) => new Date(n.publishTime).getTime()))
              ).toISOString(),
              tags: [...new Set(relatedNews.flatMap((n) => n.tags))],
              sentiment,
            }
          : e
      ),
      news: s.news.map((n) => (n.id === newsId ? { ...n, eventId } : n)),
    }));
  },

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  updateEvent: (event) =>
    set((s) => ({ events: s.events.map((e) => (e.id === event.id ? event : e)) })),
  updateEventConclusion: (eventId, conclusion) =>
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? { ...e, conclusion } : e)),
    })),

  addOpinion: (opinion) => set((s) => ({ opinions: [...s.opinions, opinion] })),
  updateOpinion: (opinion) =>
    set((s) => ({
      opinions: s.opinions.map((o) =>
        o.id === opinion.id ? { ...opinion, updatedAt: new Date().toISOString() } : o
      ),
    })),
  deleteOpinion: (id) => set((s) => ({ opinions: s.opinions.filter((o) => o.id !== id) })),

  addExportRecord: (record) =>
    set((s) => ({
      exportHistory: [
        { ...record, id: `exp_${Date.now()}` },
        ...s.exportHistory,
      ].slice(0, 20),
    })),
  clearExportHistory: () => set({ exportHistory: [] }),

  loadData: (data) => set(data),
  getExportData: () => {
    const { companies, news, events, opinions, exportHistory } = get();
    return { companies, news, events, opinions, exportHistory };
  },
}));
