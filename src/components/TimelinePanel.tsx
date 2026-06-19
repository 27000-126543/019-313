import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { SENTIMENT_COLORS } from '../types';
import { formatTime, formatDate, generateId } from '../utils';
import { Clock, Link2, Zap } from 'lucide-react';
import NewsCard from './NewsCard';
import EventCard from './EventCard';
import EventModal from './modals/EventModal';
import type { Event as EventType, NewsItem } from '../types';
import './TimelinePanel.css';

export default function TimelinePanel() {
  const companies = useStore((s) => s.companies);
  const news = useStore((s) => s.news);
  const events = useStore((s) => s.events);
  const opinions = useStore((s) => s.opinions);
  const selectedCompanyId = useStore((s) => s.selectedCompanyId);
  const selectedEventId = useStore((s) => s.selectedEventId);
  const selectedNewsId = useStore((s) => s.selectedNewsId);
  const setSelectedEvent = useStore((s) => s.setSelectedEvent);
  const setSelectedNews = useStore((s) => s.setSelectedNews);
  const mergeNewsToEvent = useStore((s) => s.mergeNewsToEvent);
  const addNewsToEvent = useStore((s) => s.addNewsToEvent);
  const updateEvent = useStore((s) => s.updateEvent);
  const currentDate = useStore((s) => s.currentDate);
  const isMorningFilter = useStore((s) => s.isMorningFilter);
  const morningFilterMode = useStore((s) => s.morningFilterMode);
  const filterImportance = useStore((s) => s.filterImportance);
  const setFilterImportance = useStore((s) => s.setFilterImportance);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [editEvent, setEditEvent] = useState<EventType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const todayItems = useMemo(() => {
    let filteredNews = news.filter((n) => formatDate(n.publishTime) === currentDate);
    let filteredEvents = events.filter((e) => formatDate(e.startTime) === currentDate);

    if (selectedCompanyId) {
      filteredNews = filteredNews.filter((n) => n.companyId === selectedCompanyId);
      filteredEvents = filteredEvents.filter((e) => e.companyId === selectedCompanyId);
    }

    if (isMorningFilter) {
      const matchedEventIds = new Set<string>();
      const matchedCompanyIds = new Set<string>();

      for (const ev of filteredEvents) {
        const company = companies.find((c) => c.id === ev.companyId);
        let keep = false;

        switch (morningFilterMode) {
          case 'all':
            keep = ev.importance === 'high';
            break;
          case 'core_portfolio':
            keep = company?.portfolio === '核心持仓';
            break;
          case 'negative_sentiment':
            keep = ev.sentiment === 'negative';
            break;
          case 'need_verify':
          case 'risk_warning': {
            const type = morningFilterMode;
            const hasOpinion = opinions.some(
              (o) =>
                o.eventId === ev.id &&
                o.type === type &&
                formatDate(o.createdAt) === currentDate
            );
            keep = hasOpinion;
            break;
          }
        }
        if (keep) matchedEventIds.add(ev.id);
      }

      if (morningFilterMode === 'need_verify' || morningFilterMode === 'risk_warning') {
        const type = morningFilterMode;
        for (const op of opinions) {
          if (formatDate(op.createdAt) !== currentDate) continue;
          if (op.type === type) {
            matchedCompanyIds.add(op.companyId);
            if (op.eventId) matchedEventIds.add(op.eventId);
          }
        }
      }

      if (morningFilterMode === 'negative_sentiment') {
        for (const n of filteredNews) {
          if (n.sentiment === 'negative') matchedCompanyIds.add(n.companyId);
        }
      }

      if (morningFilterMode === 'core_portfolio') {
        for (const c of companies) {
          if (c.portfolio === '核心持仓') matchedCompanyIds.add(c.id);
        }
      }

      filteredEvents = filteredEvents.filter((e) => matchedEventIds.has(e.id));
      const keepNewsIds = new Set(
        filteredEvents.flatMap((e) => e.newsIds)
      );

      filteredNews = filteredNews.filter(
        (n) =>
          (!n.eventId &&
            (matchedCompanyIds.size === 0 || matchedCompanyIds.has(n.companyId))) ||
          keepNewsIds.has(n.id)
      );
    }

    if (filterImportance) {
      filteredEvents = filteredEvents.filter((e) => e.importance === filterImportance);
    }

    const unmergedNews = filteredNews.filter((n) => !n.eventId);

    const allItems: Array<
      | { type: 'event'; data: EventType; time: string }
      | { type: 'news'; data: NewsItem; time: string }
    > = [
      ...filteredEvents.map((e) => ({ type: 'event' as const, data: e, time: e.startTime })),
      ...unmergedNews.map((n) => ({ type: 'news' as const, data: n, time: n.publishTime })),
    ];

    allItems.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return allItems;
  }, [
    news,
    events,
    opinions,
    companies,
    currentDate,
    selectedCompanyId,
    isMorningFilter,
    morningFilterMode,
    filterImportance,
  ]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverId(null);

    if (over && active.id !== over.id) {
      const activeIdStr = active.id as string;
      const overId = over.id as string;

      const activeNews = news.find((n) => n.id === activeIdStr);
      const overNews = news.find((n) => n.id === overId);
      const overEvent = events.find((e) => e.id === overId);

      if (activeNews && overNews && !activeNews.eventId && !overNews.eventId) {
        const company = companies.find((c) => c.id === activeNews.companyId);
        const eventTitle = prompt(
          '请输入合并后的事件标题：',
          `${company?.name || ''}相关舆情`
        );
        if (eventTitle && activeNews.companyId === overNews.companyId) {
          mergeNewsToEvent([activeIdStr, overId], eventTitle, activeNews.companyId);
        }
      } else if (activeNews && !activeNews.eventId && overEvent) {
        if (activeNews.companyId === overEvent.companyId) {
          addNewsToEvent(activeIdStr, overId);
        } else {
          alert('只能合并同一公司的舆情到该事件');
        }
      }
    }
  };

  const toggleMergeSelect = (id: string) => {
    const next = new Set(selectedForMerge);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedForMerge(next);
  };

  const handleMergeSelected = () => {
    if (selectedForMerge.size < 2) return;

    const selectedItems = Array.from(selectedForMerge);
    const firstNews = news.find((n) => n.id === selectedItems[0]);
    if (!firstNews) return;

    const allSameCompany = selectedItems.every((id) => {
      const n = news.find((item) => item.id === id);
      return n && n.companyId === firstNews.companyId && !n.eventId;
    });

    if (!allSameCompany) {
      alert('只能合并同一公司的未合并舆情');
      return;
    }

    const company = companies.find((c) => c.id === firstNews.companyId);
    const eventTitle = prompt(
      '请输入合并后的事件标题：',
      `${company?.name || ''}相关舆情`
    );
    if (eventTitle) {
      mergeNewsToEvent(selectedItems, eventTitle, firstNews.companyId);
      setSelectedForMerge(new Set());
      setMergeMode(false);
    }
  };

  const handleCreateEvent = (data: {
    title: string;
    companyId: string;
    importance: 'high' | 'medium' | 'low';
    newsIds: string[];
  }) => {
    const eventId = generateId('event');
    const relatedNews = news.filter((n) => data.newsIds.includes(n.id));

    const sentiments = relatedNews.map((n) => n.sentiment);
    const sentiment = sentiments.includes('negative')
      ? 'negative'
      : sentiments.includes('positive')
      ? 'positive'
      : 'neutral';

    const newEvent: EventType = {
      id: eventId,
      title: data.title,
      companyId: data.companyId,
      newsIds: data.newsIds,
      startTime: new Date(
        Math.min(...relatedNews.map((n) => new Date(n.publishTime).getTime()))
      ).toISOString(),
      endTime: new Date(
        Math.max(...relatedNews.map((n) => new Date(n.publishTime).getTime()))
      ).toISOString(),
      sentiment,
      tags: [...new Set(relatedNews.flatMap((n) => n.tags))],
      importance: data.importance,
      createdAt: new Date().toISOString(),
    };

    useStore.getState().addEvent(newEvent);
    for (const n of useStore.getState().news) {
      if (data.newsIds.includes(n.id)) {
        useStore.getState().updateNews({ ...n, eventId });
      }
    }
    setSelectedEvent(eventId);
  };

  const handleEditEvent = (data: {
    title: string;
    companyId: string;
    importance: 'high' | 'medium' | 'low';
    newsIds: string[];
  }) => {
    if (!editEvent) return;
    const relatedNews = news.filter((n) => data.newsIds.includes(n.id));
    updateEvent({
      ...editEvent,
      ...data,
      endTime: new Date(
        Math.max(...relatedNews.map((n) => new Date(n.publishTime).getTime()))
      ).toISOString(),
    });
    setEditEvent(null);
  };

  const activeItem = activeId
    ? news.find((n) => n.id === activeId) || events.find((e) => e.id === activeId)
    : null;

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || '未知';
  };

  const getEventOpinions = (eventId: string) => {
    return opinions.filter((o) => o.eventId === eventId);
  };

  const getNewsOpinions = (newsId: string) => {
    return opinions.filter((o) => o.newsId === newsId);
  };

  return (
    <>
      <section className="panel timeline-panel" style={{ flex: 1, minWidth: 500 }}>
        <div className="panel-header">
          <h2 className="panel-title">
            <Clock
              size={16}
              style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}
            />
            事件时间轴
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
            {mergeMode ? (
              <>
                <span
                  style={{ color: 'var(--accent-yellow)', fontSize: 11, marginRight: 8 }}
                >
                  已选 {selectedForMerge.size} 条
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleMergeSelected}
                  disabled={selectedForMerge.size < 2}
                >
                  <Link2 size={12} />
                  合并选中
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMergeMode(false);
                    setSelectedForMerge(new Set());
                  }}
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginRight: 8 }}>
                  今日 {todayItems.length} 条
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMergeMode(true)}
                >
                  <Zap size={12} />
                  批量合并
                </button>
              </>
            )}
          </div>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={filterImportance || ''}
            onChange={(e) => setFilterImportance(e.target.value || null)}
          >
            <option value="">全部重要性</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, alignSelf: 'center' }}>
            拖拽新闻可合并为事件，或拖入已有事件
          </span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="panel-content timeline-content">
            {todayItems.length === 0 ? (
              <div className="empty-state">
                <Clock size={32} className="empty-state-icon" />
                <div className="empty-state-text">
                  {isMorningFilter ? '当前筛选条件下暂无舆情' : '今日暂无舆情'}
                </div>
              </div>
            ) : (
              <div className="timeline-list">
                {todayItems.map((item, index) => {
                  const prevItem = index > 0 ? todayItems[index - 1] : null;
                  const showTimeDivider =
                    !prevItem ||
                    formatTime(item.time, 'HH') !== formatTime(prevItem.time, 'HH');

                  return (
                    <div
                      key={item.type === 'event' ? item.data.id : item.data.id}
                    >
                      {showTimeDivider && (
                        <div className="time-divider">
                          <span className="time-divider-text">
                            {formatTime(item.time, 'HH:00')}
                          </span>
                          <div className="time-divider-line" />
                        </div>
                      )}
                      {item.type === 'event' ? (
                        <EventCard
                          key={item.data.id}
                          event={item.data}
                          companyName={getCompanyName(item.data.companyId)}
                          newsItems={news.filter((n) => item.data.newsIds.includes(n.id))}
                          opinions={getEventOpinions(item.data.id)}
                          isSelected={selectedEventId === item.data.id}
                          isDragOver={dragOverId === item.data.id}
                          mergeMode={mergeMode}
                          isSelectedForMerge={false}
                          onSelect={() => {
                            if (mergeMode) return;
                            setSelectedEvent(item.data.id);
                          }}
                          onEdit={() => setEditEvent(item.data)}
                        />
                      ) : (
                        <NewsCard
                          key={item.data.id}
                          news={item.data}
                          companyName={getCompanyName(item.data.companyId)}
                          opinions={getNewsOpinions(item.data.id)}
                          isSelected={selectedNewsId === item.data.id}
                          isDragging={activeId === item.data.id}
                          isDragOver={dragOverId === item.data.id}
                          mergeMode={mergeMode}
                          isSelectedForMerge={selectedForMerge.has(item.data.id)}
                          onSelect={() => {
                            if (mergeMode) {
                              toggleMergeSelect(item.data.id);
                            } else {
                              setSelectedNews(item.data.id);
                            }
                          }}
                          onDragOverChange={(isOver) =>
                            setDragOverId(isOver ? item.data.id : null)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeId && activeItem && 'title' in activeItem ? (
              <div className="drag-overlay-item">{activeItem.title}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>

      {editEvent && (
        <EventModal
          companies={companies}
          news={news}
          initialData={editEvent}
          initialNewsIds={editEvent.newsIds}
          onClose={() => setEditEvent(null)}
          onSubmit={handleEditEvent}
        />
      )}
    </>
  );
}
