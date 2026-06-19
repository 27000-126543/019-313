import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { NewsItem, Opinion } from '../types';
import { WATCH_ITEM_TYPES, SENTIMENT_COLORS, OPINION_TYPES } from '../types';
import { formatTime, timeFromNow } from '../utils';
import { Clock, ExternalLink, MessageSquare, GripVertical, Link } from 'lucide-react';
import './NewsCard.css';

interface NewsCardProps {
  news: NewsItem;
  companyName: string;
  opinions: Opinion[];
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  mergeMode: boolean;
  isSelectedForMerge: boolean;
  onSelect: () => void;
  onDragOverChange: (isOver: boolean) => void;
}

export default function NewsCard({
  news,
  companyName,
  opinions,
  isSelected,
  isDragging,
  isDragOver,
  mergeMode,
  isSelectedForMerge,
  onSelect,
  onDragOverChange,
}: NewsCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: news.id,
    disabled: mergeMode,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: news.id,
  });

  if (isOver !== undefined && onDragOverChange) {
    onDragOverChange(isOver);
  }

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const setRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={`news-card ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''} ${mergeMode ? 'merge-mode' : ''} ${isSelectedForMerge ? 'selected-for-merge' : ''}`}
      onClick={onSelect}
    >
      {!mergeMode && (
        <div className="news-drag-handle" {...attributes} {...listeners}>
          <GripVertical size={14} />
        </div>
      )}

      {mergeMode && (
        <div className="news-merge-checkbox">
          <input type="checkbox" checked={isSelectedForMerge} readOnly />
        </div>
      )}

      <div className="news-content">
        <div className="news-header">
          <div className="news-company">
            <span className="company-tag">{companyName}</span>
            {news.watchItemType && (
              <span className="watch-item-tag" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {WATCH_ITEM_TYPES[news.watchItemType]}
              </span>
            )}
          </div>
          <div className="news-time">
            <Clock size={11} />
            {formatTime(news.publishTime)}
          </div>
        </div>

        <h3 className="news-title">{news.title}</h3>

        <p className="news-summary">{news.content}</p>

        <div className="news-footer">
          <div className="news-meta">
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
            <span className="news-confidence">
              置信度 {(news.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="news-actions">
            {opinions.length > 0 && (
              <span className="news-opinions" title={`${opinions.length}条观点`}>
                <MessageSquare size={12} />
                {opinions.length}
              </span>
            )}
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="news-link"
              title="查看原文"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {opinions.length > 0 && (
          <div className="news-opinions-preview">
            {opinions.slice(0, 2).map((op) => (
              <div key={op.id} className="opinion-preview">
                <span
                  className="opinion-type-badge"
                  style={{
                    background: `${OPINION_TYPES[op.type].color}20`,
                    color: OPINION_TYPES[op.type].color,
                  }}
                >
                  {OPINION_TYPES[op.type].label}
                </span>
                <span className="opinion-preview-text">{op.content}</span>
              </div>
            ))}
          </div>
        )}

        {news.tags.length > 0 && (
          <div className="news-tags">
            {news.tags.map((tag) => (
              <span key={tag} className="news-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
