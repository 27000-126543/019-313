import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import type { Event as EventType, NewsItem, Opinion, EventConclusion } from '../types';
import { SENTIMENT_COLORS, OPINION_TYPES } from '../types';
import { formatTime } from '../utils';
import {
  Clock,
  Edit2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
  Compass,
  Calendar,
  Check,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import './EventCard.css';

interface EventCardProps {
  event: EventType;
  companyName: string;
  newsItems: NewsItem[];
  opinions: Opinion[];
  isSelected: boolean;
  isDragOver: boolean;
  mergeMode: boolean;
  isSelectedForMerge: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

export default function EventCard({
  event,
  companyName,
  newsItems,
  opinions,
  isSelected,
  isDragOver,
  mergeMode,
  isSelectedForMerge,
  onSelect,
  onEdit,
}: EventCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: event.id,
  });
  const updateEventConclusion = useStore((s) => s.updateEventConclusion);

  const [expanded, setExpanded] = useState(true);
  const [editingConclusion, setEditingConclusion] = useState(false);
  const [draftConclusion, setDraftConclusion] = useState<EventConclusion>(
    event.conclusion || { coreJudgment: '', impactScope: '', followUpTime: '' }
  );

  const sortedNews = [...newsItems].sort(
    (a, b) => new Date(a.publishTime).getTime() - new Date(b.publishTime).getTime()
  );

  const startEditConclusion = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftConclusion(
      event.conclusion || { coreJudgment: '', impactScope: '', followUpTime: '' }
    );
    setEditingConclusion(true);
  };

  const saveConclusion = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateEventConclusion(event.id, draftConclusion);
    setEditingConclusion(false);
  };

  const cancelConclusion = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConclusion(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`event-card ${isSelected ? 'selected' : ''} ${isOver || isDragOver ? 'drag-over' : ''} importance-${event.importance}`}
      onClick={onSelect}
    >
      <div className="event-left-border" />

      <div className="event-content">
        <div className="event-header">
          <div className="event-main">
            <div className="event-title-row">
              <span className="company-tag">{companyName}</span>
              <span className={`badge badge-importance-${event.importance}`}>
                {event.importance === 'high' ? '高重要' : event.importance === 'medium' ? '中重要' : '低重要'}
              </span>
              <span
                className="badge badge-sentiment"
                style={{
                  background: `${SENTIMENT_COLORS[event.sentiment]}20`,
                  color: SENTIMENT_COLORS[event.sentiment],
                }}
              >
                {event.sentiment === 'positive' ? '正面' : event.sentiment === 'negative' ? '负面' : '中性'}
              </span>
            </div>
            <h3 className="event-title">{event.title}</h3>
          </div>

          <div className="event-side">
            <div className="event-time">
              <Clock size={11} />
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </div>
            <div className="event-counts">
              <span className="event-count">
                <FileText size={11} />
                {event.newsIds.length} 条
              </span>
              {opinions.length > 0 && (
                <span className="event-count opinions">
                  <MessageSquare size={11} />
                  {opinions.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {event.tags.length > 0 && (
          <div className="event-tags">
            {event.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="event-tag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="event-conclusion-section">
          {editingConclusion ? (
            <div className="conclusion-editor" onClick={(e) => e.stopPropagation()}>
              <div className="conclusion-field">
                <div className="conclusion-field-label">
                  <Target size={12} /> 核心判断
                </div>
                <textarea
                  className="form-textarea"
                  value={draftConclusion.coreJudgment}
                  onChange={(e) =>
                    setDraftConclusion({ ...draftConclusion, coreJudgment: e.target.value })
                  }
                  placeholder="一句话定性：事件性质、真假、影响大小..."
                  rows={2}
                />
              </div>
              <div className="conclusion-field">
                <div className="conclusion-field-label">
                  <Compass size={12} /> 影响范围
                </div>
                <textarea
                  className="form-textarea"
                  value={draftConclusion.impactScope}
                  onChange={(e) =>
                    setDraftConclusion({ ...draftConclusion, impactScope: e.target.value })
                  }
                  placeholder="对业绩/估值/情绪/渠道等的具体影响..."
                  rows={2}
                />
              </div>
              <div className="conclusion-field">
                <div className="conclusion-field-label">
                  <Calendar size={12} /> 后续跟踪时间
                </div>
                <input
                  className="form-input"
                  value={draftConclusion.followUpTime}
                  onChange={(e) =>
                    setDraftConclusion({ ...draftConclusion, followUpTime: e.target.value })
                  }
                  placeholder="如：2026-03-20 糖酒会 / 一季报 / 下月经销商调研"
                />
              </div>
              <div className="conclusion-actions">
                <button className="btn btn-primary btn-sm" onClick={saveConclusion}>
                  <Check size={12} /> 保存
                </button>
                <button className="btn btn-secondary btn-sm" onClick={cancelConclusion}>
                  <X size={12} /> 取消
                </button>
              </div>
            </div>
          ) : event.conclusion && (event.conclusion.coreJudgment || event.conclusion.impactScope || event.conclusion.followUpTime) ? (
            <div className="conclusion-display">
              <div className="conclusion-header">
                <span className="conclusion-title">复盘结论</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => startEditConclusion(e)}
                >
                  <Edit2 size={11} />
                </button>
              </div>
              {event.conclusion.coreJudgment && (
                <div className="conclusion-item">
                  <Target size={12} className="conclusion-icon" />
                  <div>
                    <span className="conclusion-label">核心判断</span>
                    <span className="conclusion-value">{event.conclusion.coreJudgment}</span>
                  </div>
                </div>
              )}
              {event.conclusion.impactScope && (
                <div className="conclusion-item">
                  <Compass size={12} className="conclusion-icon" />
                  <div>
                    <span className="conclusion-label">影响范围</span>
                    <span className="conclusion-value">{event.conclusion.impactScope}</span>
                  </div>
                </div>
              )}
              {event.conclusion.followUpTime && (
                <div className="conclusion-item">
                  <Calendar size={12} className="conclusion-icon" />
                  <div>
                    <span className="conclusion-label">跟踪时间</span>
                    <span className="conclusion-value">{event.conclusion.followUpTime}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="conclusion-empty">
              <button
                className="btn btn-secondary btn-sm add-conclusion-btn"
                onClick={(e) => startEditConclusion(e)}
              >
                + 添加复盘结论
              </button>
            </div>
          )}
        </div>

        <div className="event-expand-row">
          <button
            className="event-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? '收起详情' : `展开 ${event.newsIds.length} 条相关舆情`}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 size={11} />
            编辑
          </button>
        </div>

        {expanded && (
          <div className="event-news-list">
            {sortedNews.map((news) => (
              <div key={news.id} className="event-news-item">
                <div className="event-news-time">{formatTime(news.publishTime)}</div>
                <div className="event-news-content">
                  <div className="event-news-title">{news.title}</div>
                  <div className="event-news-meta">
                    <span className="news-source">{news.source}</span>
                    <span
                      className="news-sentiment"
                      style={{
                        background: `${SENTIMENT_COLORS[news.sentiment]}20`,
                        color: SENTIMENT_COLORS[news.sentiment],
                      }}
                    >
                      {news.sentiment === 'positive' ? '正面' : news.sentiment === 'negative' ? '负面' : '中性'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {opinions.length > 0 && (
          <div className="event-opinions">
            <div className="event-opinions-header">
              <MessageSquare size={12} />
              <span>相关观点 ({opinions.length})</span>
            </div>
            {opinions.slice(0, 3).map((op) => (
              <div key={op.id} className="event-opinion-item">
                <span
                  className="opinion-type-badge"
                  style={{
                    background: `${OPINION_TYPES[op.type].color}20`,
                    color: OPINION_TYPES[op.type].color,
                  }}
                >
                  {OPINION_TYPES[op.type].label}
                </span>
                <span className="opinion-text">{op.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
