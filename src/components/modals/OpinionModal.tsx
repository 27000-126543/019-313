import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Opinion, OpinionType, Company, Event as EventType, NewsItem } from '../../types';
import { OPINION_TYPES } from '../../types';

interface OpinionModalProps {
  companies: Company[];
  events: EventType[];
  news: NewsItem[];
  initialData?: Opinion;
  defaultCompanyId?: string;
  defaultEventId?: string;
  defaultNewsId?: string;
  onClose: () => void;
  onSubmit: (data: {
    type: OpinionType;
    content: string;
    reportRef?: string;
    eventId?: string;
    newsId?: string;
    companyId: string;
  }) => void;
}

export default function OpinionModal({
  companies,
  events,
  news,
  initialData,
  defaultCompanyId,
  defaultEventId,
  defaultNewsId,
  onClose,
  onSubmit,
}: OpinionModalProps) {
  const [type, setType] = useState<OpinionType>(initialData?.type || 'note');
  const [content, setContent] = useState(initialData?.content || '');
  const [reportRef, setReportRef] = useState(initialData?.reportRef || '');
  const [companyId, setCompanyId] = useState(
    initialData?.companyId || defaultCompanyId || companies[0]?.id || ''
  );
  const [linkType, setLinkType] = useState<'none' | 'event' | 'news'>(
    initialData?.eventId ? 'event' : initialData?.newsId ? 'news' : defaultEventId ? 'event' : defaultNewsId ? 'news' : 'none'
  );
  const [eventId, setEventId] = useState(initialData?.eventId || defaultEventId || '');
  const [newsId, setNewsId] = useState(initialData?.newsId || defaultNewsId || '');

  useEffect(() => {
    if (linkType === 'event' && !eventId) {
      const companyEvents = events.filter((e) => e.companyId === companyId);
      if (companyEvents.length > 0) {
        setEventId(companyEvents[0].id);
      }
    }
    if (linkType === 'news' && !newsId) {
      const companyNews = news.filter((n) => n.companyId === companyId && !n.eventId);
      if (companyNews.length > 0) {
        setNewsId(companyNews[0].id);
      }
    }
  }, [linkType, companyId, events, news, eventId, newsId]);

  const filteredEvents = events.filter((e) => e.companyId === companyId);
  const filteredNews = news.filter((n) => n.companyId === companyId);

  const handleSubmit = () => {
    if (!content.trim()) {
      alert('请填写观点内容');
      return;
    }
    const data: Parameters<typeof onSubmit>[0] = {
      type,
      content: content.trim(),
      companyId,
    };
    if (reportRef.trim()) {
      data.reportRef = reportRef.trim();
    }
    if (linkType === 'event' && eventId) {
      data.eventId = eventId;
    }
    if (linkType === 'news' && newsId) {
      data.newsId = newsId;
    }
    onSubmit(data);
  };

  const quickTemplates: Record<OpinionType, string> = {
    need_verify: '需要联系上市公司核实以下信息：\n1. \n2. \n重点关注后续进展。',
    wait_announcement: '等待公司公告或定期报告披露，重点关注：\n- \n建议观察期：1-2周',
    include_weekly: '核心观点：\n\n建议纳入本周组合周报重点讨论。',
    reduce_focus: '短期影响有限，降低关注频率。\n核心逻辑：\n1. \n2. ',
    increase_focus: '事件值得重点跟踪，加强关注。\n核心原因：\n1. \n2. \n后续观察点：',
    risk_warning: '【风险提示】\n事件性质：\n潜在影响：\n建议操作：',
    buy_signal: '【买入信号】\n核心逻辑：\n1. \n2. \n目标价：\n止损位：',
    note: '研究笔记：\n\n',
  };

  const applyTemplate = () => {
    if (!content || confirm('使用模板会覆盖当前内容，确定继续吗？')) {
      setContent(quickTemplates[type]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ minWidth: 550 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{initialData ? '编辑观点' : '记录观点'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">关联公司</label>
              <select
                className="form-select"
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setEventId('');
                  setNewsId('');
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">观点类型</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as OpinionType)}
              >
                {Object.entries(OPINION_TYPES).map(([t, info]) => (
                  <option key={t} value={t}>{info.label as string}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                观点内容
              </label>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={applyTemplate}
              >
                使用模板
              </button>
            </div>
            <textarea
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录你的研究观点..."
              style={{ minHeight: 120, marginTop: 6 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">关联研报段落 (可选)</label>
            <input
              className="form-input"
              value={reportRef}
              onChange={(e) => setReportRef(e.target.value)}
              placeholder="如：贵州茅台2024Q1业绩前瞻-第3章"
            />
          </div>

          <div className="form-group">
            <label className="form-label">关联舆情/事件 (可选)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="radio"
                  name="linkType"
                  checked={linkType === 'none'}
                  onChange={() => setLinkType('none')}
                />
                不关联
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="radio"
                  name="linkType"
                  checked={linkType === 'event'}
                  onChange={() => setLinkType('event')}
                />
                关联事件
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="radio"
                  name="linkType"
                  checked={linkType === 'news'}
                  onChange={() => setLinkType('news')}
                />
                关联单条舆情
              </label>
            </div>

            {linkType === 'event' && (
              <select
                className="form-select"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              >
                <option value="">请选择事件</option>
                {filteredEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            )}

            {linkType === 'news' && (
              <select
                className="form-select"
                value={newsId}
                onChange={(e) => setNewsId(e.target.value)}
              >
                <option value="">请选择舆情</option>
                {filteredNews.map((n) => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {initialData ? '保存' : '记录'}
          </button>
        </div>
      </div>
    </div>
  );
}
