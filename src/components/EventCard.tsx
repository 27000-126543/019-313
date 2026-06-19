import { useDroppable } from '@dnd-kit/core';
import type { Event as EventType, NewsItem, Opinion } from '../types';
import { SENTIMENT_COLORS, OPINION_TYPES } from '../types';
import { formatTime } from '../utils';
import { AlertCircle, Clock, Edit2, MessageSquare, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useState } from 'react';
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

  const [expanded, setExpanded] = useState(false);

  const sortedNews = [...newsItems].sort(
    (a, b) => new Date(a.publishTime).getTime() - new Date(b.publishTime).getTime()
  );

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
