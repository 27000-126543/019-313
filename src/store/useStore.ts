import { create } from 'zustand';
import type { AppData, Company, NewsItem, Event, Opinion } from '../types';

interface StoreState extends AppData {
  selectedCompanyId: string | null;
  selectedEventId: string | null;
  selectedNewsId: string | null;
  currentDate: string;
  filterPortfolio: string | null;
  filterIndustry: string | null;
  filterImportance: string | null;
  isMorningFilter: boolean;
  setSelectedCompany: (id: string | null) => void;
  setSelectedEvent: (id: string | null) => void;
  setSelectedNews: (id: string | null) => void;
  setCurrentDate: (date: string) => void;
  setFilterPortfolio: (filter: string | null) => void;
  setFilterIndustry: (filter: string | null) => void;
  setFilterImportance: (filter: string | null) => void;
  toggleMorningFilter: () => void;
  addCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
  deleteCompany: (id: string) => void;
  addNews: (news: NewsItem) => void;
  updateNews: (news: NewsItem) => void;
  mergeNewsToEvent: (newsIds: string[], eventTitle: string, companyId: string) => void;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  addOpinion: (opinion: Opinion) => void;
  updateOpinion: (opinion: Opinion) => void;
  deleteOpinion: (id: string) => void;
  loadData: (data: AppData) => void;
  getExportData: () => AppData;
}

const initialState: AppData = {
  companies: [],
  news: [],
  events: [],
  opinions: [],
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

  setSelectedCompany: (id) => set({ selectedCompanyId: id, selectedEventId: null, selectedNewsId: null }),
  setSelectedEvent: (id) => set({ selectedEventId: id, selectedNewsId: null }),
  setSelectedNews: (id) => set({ selectedNewsId: id }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setFilterPortfolio: (filter) => set({ filterPortfolio: filter }),
  setFilterIndustry: (filter) => set({ filterIndustry: filter }),
  setFilterImportance: (filter) => set({ filterImportance: filter }),
  toggleMorningFilter: () => set((s) => ({ isMorningFilter: !s.isMorningFilter })),

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
    const importances = relatedNews
      .flatMap((n) =>
        state.events.filter((e) => n.eventId === e.id).map((e) => e.importance)
      ) as Array<'high' | 'medium' | 'low'>;
    const importance = importances.includes('high')
      ? 'high'
      : importances.includes('medium')
      ? 'medium'
      : 'low';

    const newEvent: Event = {
      id: eventId,
      title: eventTitle,
      companyId,
      newsIds,
      startTime: new Date(Math.min(...relatedNews.map((n) => new Date(n.publishTime).getTime()))).toISOString(),
      endTime: new Date(Math.max(...relatedNews.map((n) => new Date(n.publishTime).getTime()))).toISOString(),
      sentiment,
      tags: [...new Set(relatedNews.flatMap((n) => n.tags))],
      importance,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      events: [...s.events, newEvent],
      news: s.news.map((n) => (newsIds.includes(n.id) ? { ...n, eventId } : n)),
      selectedEventId: eventId,
    }));
  },

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  updateEvent: (event) =>
    set((s) => ({ events: s.events.map((e) => (e.id === event.id ? event : e)) })),

  addOpinion: (opinion) => set((s) => ({ opinions: [...s.opinions, opinion] })),
  updateOpinion: (opinion) =>
    set((s) => ({
      opinions: s.opinions.map((o) => (o.id === opinion.id ? { ...opinion, updatedAt: new Date().toISOString() } : o)),
    })),
  deleteOpinion: (id) => set((s) => ({ opinions: s.opinions.filter((o) => o.id !== id) })),

  loadData: (data) => set(data),
  getExportData: () => {
    const { companies, news, events, opinions } = get();
    return { companies, news, events, opinions };
  },
}));
