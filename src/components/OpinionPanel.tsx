import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { OPINION_TYPES, SENTIMENT_COLORS } from '../types';
import { formatDate, formatTime, generateId } from '../utils';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Link,
  FileText,
  Filter,
  Eye,
  Target,
  Compass,
  Calendar,
  ListChecks,
  AlertCircle,
} from 'lucide-react';
import OpinionModal from './modals/OpinionModal';
import type { Opinion, OpinionType, Event } from '../types';
import './OpinionPanel.css';

type ViewMode = 'opinions' | 'conclusions';

export default function OpinionPanel() {
  const opinions = useStore((s) => s.opinions);
  const companies = useStore((s) => s.companies);
  const news = useStore((s) => s.news);
  const events = useStore((s) => s.events);
  const selectedEventId = useStore((s) => s.selectedEventId);
  const selectedNewsId = useStore((s) => s.selectedNewsId);
  const selectedCompanyId = useStore((s) => s.selectedCompanyId);
  const isMorningFilter = useStore((s) => s.isMorningFilter);
  const morningFilterMode = useStore((s) => s.morningFilterMode);
  const currentDate = useStore((s) => s.currentDate);
  const addOpinion = useStore((s) => s.addOpinion);
  const updateOpinion = useStore((s) => s.updateOpinion);
  const deleteOpinion = useStore((s) => s.deleteOpinion);

  const [filterType, setFilterType] = useState<OpinionType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('opinions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editOpinion, setEditOpinion] = useState<Opinion | null>(null);

  const getActivePortfolio = (): string | null => {
    if (typeof morningFilterMode === 'string' && morningFilterMode.startsWith('portfolio:')) {
      return morningFilterMode.replace('portfolio:', '');
    }
    return null;
  };

  const activePortfolio = getActivePortfolio();

  const filteredOpinions = useMemo(() => {
    let filtered = opinions;

    if (isMorningFilter && activePortfolio) {
      const portfolioCompanyIds = companies
        .filter((c) => c.portfolio === activePortfolio)
        .map((c) => c.id);
      filtered = filtered.filter((o) => portfolioCompanyIds.includes(o.companyId));
    } else if (selectedCompanyId) {
      filtered = filtered.filter((o) => o.companyId === selectedCompanyId);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((o) => o.type === filterType);
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [opinions, selectedCompanyId, filterType, isMorningFilter, activePortfolio, companies]);

  const todayOpinions = useMemo(
    () => {
      let filtered = opinions.filter((o) => formatDate(o.createdAt) === currentDate);
      if (isMorningFilter && activePortfolio) {
        const portfolioCompanyIds = companies
          .filter((c) => c.portfolio === activePortfolio)
          .map((c) => c.id);
        filtered = filtered.filter((o) => portfolioCompanyIds.includes(o.companyId));
      }
      return filtered;
    },
    [opinions, currentDate, isMorningFilter, activePortfolio, companies]
  );

  const todayEventsWithConclusions = useMemo(() => {
    let todayEvents = events.filter(
      (e) => formatDate(e.startTime) === currentDate && e.conclusion
    );
    if (isMorningFilter && activePortfolio) {
      const portfolioCompanyIds = companies
        .filter((c) => c.portfolio === activePortfolio)
        .map((c) => c.id);
      todayEvents = todayEvents.filter((e) => portfolioCompanyIds.includes(e.companyId));
    }
    return todayEvents.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [events, currentDate, isMorningFilter, activePortfolio, companies]);

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || '未知';
  };

  const getRelatedTitle = (opinion: Opinion) => {
    if (opinion.eventId) {
      const event = events.find((e) => e.id === opinion.eventId);
      return event?.title || '关联事件';
    }
    if (opinion.newsId) {
      const newsItem = news.find((n) => n.id === opinion.newsId);
      return newsItem?.title || '关联舆情';
    }
    return null;
  };

  const getRelatedSentiment = (opinion: Opinion) => {
    if (opinion.eventId) {
      const event = events.find((e) => e.id === opinion.eventId);
      return event?.sentiment;
    }
    if (opinion.newsId) {
      const newsItem = news.find((n) => n.id === opinion.newsId);
      return newsItem?.sentiment;
    }
    return null;
  };

  const handleAddOpinion = (data: {
    type: OpinionType;
    content: string;
    reportRef?: string;
    eventId?: string;
    newsId?: string;
    companyId: string;
  }) => {
    const now = new Date().toISOString();
    const newOpinion: Opinion = {
      id: generateId('op'),
      type: data.type,
      content: data.content,
      reportRef: data.reportRef,
      eventId: data.eventId,
      newsId: data.newsId,
      companyId: data.companyId,
      createdAt: now,
      updatedAt: now,
    };
    addOpinion(newOpinion);
    setShowAddModal(false);
  };

  const handleUpdateOpinion = (data: {
    type: OpinionType;
    content: string;
    reportRef?: string;
    eventId?: string;
    newsId?: string;
    companyId: string;
  }) => {
    if (!editOpinion) return;
    updateOpinion({ ...editOpinion, ...data });
    setEditOpinion(null);
  };

  const getDefaultCompanyId = () => {
    if (selectedEventId) {
      const event = events.find((e) => e.id === selectedEventId);
      if (event) return event.companyId;
    }
    if (selectedNewsId) {
      const newsItem = news.find((n) => n.id === selectedNewsId);
      if (newsItem) return newsItem.companyId;
    }
    return selectedCompanyId || companies[0]?.id || '';
  };

  const opinionTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const op of todayOpinions) {
      counts[op.type] = (counts[op.type] || 0) + 1;
    }
    return counts;
  }, [todayOpinions]);

  const conclusionSummary = useMemo(() => {
    const coreJudgments: Array<{ event: Event; value: string }> = [];
    const impactScopes: Array<{ event: Event; value: string }> = [];
    const followUps: Array<{ event: Event; value: string }> = [];

    for (const ev of todayEventsWithConclusions) {
      if (ev.conclusion?.coreJudgment) {
        coreJudgments.push({ event: ev, value: ev.conclusion.coreJudgment });
      }
      if (ev.conclusion?.impactScope) {
        impactScopes.push({ event: ev, value: ev.conclusion.impactScope });
      }
      if (ev.conclusion?.followUpTime) {
        followUps.push({ event: ev, value: ev.conclusion.followUpTime });
      }
    }

    return { coreJudgments, impactScopes, followUps };
  }, [todayEventsWithConclusions]);

  return (
    <>
      <aside className="panel opinion-panel" style={{ width: 420 }}>
        <div className="panel-header">
          <h2 className="panel-title">
            <MessageSquare size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            观点沉淀
            {isMorningFilter && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: 'var(--accent-yellow)',
                  fontWeight: 500,
                }}
              >
                · 晨会筛选中
              </span>
            )}
          </h2>
          <div className="panel-actions">
            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginRight: 8 }}>
              今日 {todayOpinions.length} 条
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddModal(true)}
              disabled={companies.length === 0}
            >
              <Plus size={12} />
              记录观点
            </button>
          </div>
        </div>

        <div className="view-tabs">
          <button
            className={`view-tab ${viewMode === 'opinions' ? 'active' : ''}`}
            onClick={() => setViewMode('opinions')}
          >
            <MessageSquare size={12} />
            观点列表
          </button>
          <button
            className={`view-tab ${viewMode === 'conclusions' ? 'active' : ''}`}
            onClick={() => setViewMode('conclusions')}
          >
            <ListChecks size={12} />
            结论汇总
            {todayEventsWithConclusions.length > 0 && (
              <span className="view-tab-badge">{todayEventsWithConclusions.length}</span>
            )}
          </button>
        </div>

        {viewMode === 'opinions' && (
          <>
            <div className="opinion-stats">
              {Object.entries(OPINION_TYPES).map(([type, info]) => (
                <div
                  key={type}
                  className={`opinion-stat-item ${filterType === type ? 'active' : ''}`}
                  onClick={() => setFilterType(filterType === type ? 'all' : type as OpinionType)}
                >
                  <div className="opinion-stat-count" style={{ color: info.color }}>
                    {opinionTypeCounts[type] || 0}
                  </div>
                  <div className="opinion-stat-label">{info.label}</div>
                </div>
              ))}
            </div>

            <div className="filter-bar">
              <Filter size={12} style={{ color: 'var(--text-muted)' }} />
              <select
                className="filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as OpinionType | 'all')}
              >
                <option value="all">全部类型</option>
                {Object.entries(OPINION_TYPES).map(([type, info]) => (
                  <option key={type} value={type}>{info.label}</option>
                ))}
              </select>
            </div>

            <div className="panel-content">
              {filteredOpinions.length === 0 ? (
                <div className="empty-state">
                  <MessageSquare size={32} className="empty-state-icon" />
                  <div className="empty-state-text">暂无观点记录</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    点击右上角按钮记录研究观点
                  </div>
                </div>
              ) : (
                <div className="opinion-list">
                  {filteredOpinions.map((opinion) => {
                    const typeInfo = OPINION_TYPES[opinion.type];
                    const relatedTitle = getRelatedTitle(opinion);
                    const relatedSentiment = getRelatedSentiment(opinion);

                    return (
                      <div key={opinion.id} className="opinion-card">
                        <div className="opinion-card-header">
                          <div className="opinion-card-left">
                            <span
                              className="opinion-type-badge-large"
                              style={{
                                background: `${typeInfo.color}20`,
                                color: typeInfo.color,
                                borderColor: `${typeInfo.color}40`,
                              }}
                            >
                              {typeInfo.label}
                            </span>
                            <span className="opinion-company">{getCompanyName(opinion.companyId)}</span>
                          </div>
                          <div className="opinion-card-actions">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditOpinion(opinion)}
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                if (confirm('确定删除这条观点吗？')) {
                                  deleteOpinion(opinion.id);
                                }
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        <div className="opinion-content">{opinion.content}</div>

                        {relatedTitle && (
                          <div className="opinion-related">
                            <Link size={11} />
                            <span className="opinion-related-text">{relatedTitle}</span>
                            {relatedSentiment && (
                              <span
                                className="opinion-related-sentiment"
                                style={{
                                  background: `${SENTIMENT_COLORS[relatedSentiment]}20`,
                                  color: SENTIMENT_COLORS[relatedSentiment],
                                }}
                              >
                                {relatedSentiment === 'positive' ? '正面' : relatedSentiment === 'negative' ? '负面' : '中性'}
                              </span>
                            )}
                          </div>
                        )}

                        {opinion.reportRef && (
                          <div className="opinion-report">
                            <FileText size={11} />
                            <span className="opinion-report-text">{opinion.reportRef}</span>
                          </div>
                        )}

                        <div className="opinion-card-footer">
                          <div className="opinion-time">
                            <Eye size={11} />
                            {formatDate(opinion.createdAt, 'MM-DD')} {formatTime(opinion.createdAt)}
                          </div>
                          {opinion.updatedAt !== opinion.createdAt && (
                            <span className="opinion-updated">
                              已编辑 · {formatDate(opinion.updatedAt, 'MM-DD HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {viewMode === 'conclusions' && (
          <div className="panel-content">
            {todayEventsWithConclusions.length === 0 ? (
              <div className="empty-state">
                <ListChecks size={32} className="empty-state-icon" />
                <div className="empty-state-text">暂无复盘结论</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  在事件卡片中添加复盘结论后，这里会自动汇总
                </div>
              </div>
            ) : (
              <div className="conclusions-summary">
                {conclusionSummary.followUps.length > 0 && (
                  <div className="conclusion-section">
                    <div className="conclusion-section-header">
                      <Calendar size={14} style={{ color: '#8b5cf6' }} />
                      <span className="conclusion-section-title">后续跟踪时间</span>
                      <span className="conclusion-section-count">{conclusionSummary.followUps.length}项</span>
                    </div>
                    <div className="conclusion-section-items">
                      {conclusionSummary.followUps.map(({ event, value }) => (
                        <div key={event.id} className="conclusion-item">
                          <div className="conclusion-item-event">
                            <AlertCircle size={11} style={{ color: '#ef4444' }} />
                            <span>{getCompanyName(event.companyId)} · {event.title}</span>
                          </div>
                          <div className="conclusion-item-value">
                            <Calendar size={11} />
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {conclusionSummary.coreJudgments.length > 0 && (
                  <div className="conclusion-section">
                    <div className="conclusion-section-header">
                      <Target size={14} style={{ color: '#8b5cf6' }} />
                      <span className="conclusion-section-title">核心判断</span>
                      <span className="conclusion-section-count">{conclusionSummary.coreJudgments.length}项</span>
                    </div>
                    <div className="conclusion-section-items">
                      {conclusionSummary.coreJudgments.map(({ event, value }) => (
                        <div key={event.id} className="conclusion-item">
                          <div className="conclusion-item-event">
                            <AlertCircle size={11} style={{ color: '#ef4444' }} />
                            <span>{getCompanyName(event.companyId)} · {event.title}</span>
                          </div>
                          <div className="conclusion-item-value">
                            <Target size={11} />
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {conclusionSummary.impactScopes.length > 0 && (
                  <div className="conclusion-section">
                    <div className="conclusion-section-header">
                      <Compass size={14} style={{ color: '#8b5cf6' }} />
                      <span className="conclusion-section-title">影响范围</span>
                      <span className="conclusion-section-count">{conclusionSummary.impactScopes.length}项</span>
                    </div>
                    <div className="conclusion-section-items">
                      {conclusionSummary.impactScopes.map(({ event, value }) => (
                        <div key={event.id} className="conclusion-item">
                          <div className="conclusion-item-event">
                            <AlertCircle size={11} style={{ color: '#ef4444' }} />
                            <span>{getCompanyName(event.companyId)} · {event.title}</span>
                          </div>
                          <div className="conclusion-item-value">
                            <Compass size={11} />
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>

      {showAddModal && (
        <OpinionModal
          companies={companies}
          events={events}
          news={news}
          defaultCompanyId={getDefaultCompanyId()}
          defaultEventId={selectedEventId || undefined}
          defaultNewsId={selectedNewsId || undefined}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddOpinion}
        />
      )}

      {editOpinion && (
        <OpinionModal
          companies={companies}
          events={events}
          news={news}
          initialData={editOpinion}
          onClose={() => setEditOpinion(null)}
          onSubmit={handleUpdateOpinion}
        />
      )}
    </>
  );
}
