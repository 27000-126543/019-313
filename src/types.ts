export interface Company {
  id: string;
  code: string;
  name: string;
  industry: string;
  portfolio: string;
  watchItems: WatchItem[];
  position: number;
  createdAt: string;
}

export interface WatchItem {
  id: string;
  name: string;
  type: WatchItemType;
  enabled: boolean;
  description: string;
}

export type WatchItemType =
  | 'order_rumor'
  | 'policy_benefit'
  | 'customer_complaint'
  | 'financial_doubt'
  | 'management_change'
  | 'price_fluctuation'
  | 'competitor_dynamics'
  | 'other';

export interface NewsItem {
  id: string;
  companyId: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishTime: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  tags: string[];
  watchItemType?: WatchItemType;
  eventId?: string;
}

export interface EventConclusion {
  coreJudgment: string;
  impactScope: string;
  followUpTime: string;
}

export interface Event {
  id: string;
  title: string;
  companyId: string;
  newsIds: string[];
  startTime: string;
  endTime: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  tags: string[];
  importance: 'high' | 'medium' | 'low';
  conclusion?: EventConclusion;
  createdAt: string;
}

export type ExportType = 'morning' | 'close';

export interface ExportRecord {
  id: string;
  type: ExportType;
  filename: string;
  path: string;
  exportedAt: string;
  portfolio?: string;
  itemCount: number;
}

export interface Opinion {
  id: string;
  eventId?: string;
  newsId?: string;
  companyId: string;
  type: OpinionType;
  content: string;
  reportRef?: string;
  createdAt: string;
  updatedAt: string;
}

export type OpinionType =
  | 'need_verify'
  | 'wait_announcement'
  | 'include_weekly'
  | 'reduce_focus'
  | 'increase_focus'
  | 'risk_warning'
  | 'buy_signal'
  | 'note';

export interface AppData {
  companies: Company[];
  news: NewsItem[];
  events: Event[];
  opinions: Opinion[];
  exportHistory: ExportRecord[];
}

export const WATCH_ITEM_TYPES: Record<WatchItemType, string> = {
  order_rumor: '订单传闻',
  policy_benefit: '政策利好',
  customer_complaint: '客户投诉',
  financial_doubt: '财务质疑',
  management_change: '管理层变动',
  price_fluctuation: '股价异动',
  competitor_dynamics: '竞对动态',
  other: '其他',
};

export const OPINION_TYPES: Record<OpinionType, { label: string; color: string }> = {
  need_verify: { label: '需电话核实', color: '#f59e0b' },
  wait_announcement: { label: '等待公告', color: '#3b82f6' },
  include_weekly: { label: '纳入周报', color: '#10b981' },
  reduce_focus: { label: '降低关注', color: '#6b7280' },
  increase_focus: { label: '加强关注', color: '#ef4444' },
  risk_warning: { label: '风险提示', color: '#dc2626' },
  buy_signal: { label: '买入信号', color: '#059669' },
  note: { label: '研究笔记', color: '#8b5cf6' },
};

export const SENTIMENT_COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
};
