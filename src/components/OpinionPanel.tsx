import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { OPINION_TYPES, SENTIMENT_COLORS } from '../types';
import { formatDate, formatTime, generateId } from '../utils';
import { MessageSquare, Plus, Trash2, Edit2, Link, FileText, Filter, Eye } from 'lucide-react';
import OpinionModal from './modals/OpinionModal';
import type { Opinion, OpinionType } from '../types';
import './OpinionPanel.css';

export default function OpinionPanel() {
  const opinions = useStore((s) => s.opinions);
  const companies = useStore((s) => s.companies);
  const news = useStore((s) => s.news);
  const events = useStore((s) => s.events);
  const selectedEventId = useStore((s) => s.selectedEventId);
  const selectedNewsId = useStore((s) => s.selectedNewsId);
  const selectedCompanyId = useStore((s) => s.selectedCompanyId);
  const addOpinion = useStore((s) => s.addOpinion);
  const updateOpinion = useStore((s) => s.updateOpinion);
  const deleteOpinion = useStore((s) => s.deleteOpinion);
  const currentDate = useStore((s) => s.currentDate);

  const [filterType, setFilterType] = useState<OpinionType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editOpinion, setEditOpinion] = useState<Opinion | null>(null);

  const filteredOpinions = useMemo(() => {
    let filtered = opinions;

    if (selectedCompanyId) {
      filtered = filtered.filter((o) => o.companyId === selectedCompanyId);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((o) => o.type === filterType);
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [opinions, selectedCompanyId, filterType]);

  const todayOpinions = useMemo(
    () => opinions.filter((o) => formatDate(o.createdAt) === currentDate),
    [opinions, currentDate]
  );

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

  return (
    <>
      <aside className="panel opinion-panel" style={{ width: 420 }}>
        <div className="panel-header">
          <h2 className="panel-title">
            <MessageSquare size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            观点沉淀
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
