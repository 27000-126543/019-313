import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Event as EventType, Company, NewsItem } from '../../types';

interface EventModalProps {
  companies: Company[];
  news: NewsItem[];
  initialData?: EventType;
  initialNewsIds?: string[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    companyId: string;
    importance: 'high' | 'medium' | 'low';
    newsIds: string[];
  }) => void;
}

export default function EventModal({ companies, news, initialData, initialNewsIds, onClose, onSubmit }: EventModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [companyId, setCompanyId] = useState(initialData?.companyId || companies[0]?.id || '');
  const [importance, setImportance] = useState<'high' | 'medium' | 'low'>(initialData?.importance || 'medium');
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>(
    initialData?.newsIds || initialNewsIds || []
  );

  const availableNews = useMemo(() => {
    return news.filter((n) => n.companyId === companyId && !n.eventId);
  }, [news, companyId]);

  const toggleNews = (newsId: string) => {
    if (selectedNewsIds.includes(newsId)) {
      setSelectedNewsIds(selectedNewsIds.filter((id) => id !== newsId));
    } else {
      setSelectedNewsIds([...selectedNewsIds, newsId]);
    }
  };

  const handleSubmit = () => {
    if (!title) {
      alert('请输入事件标题');
      return;
    }
    if (selectedNewsIds.length === 0) {
      alert('请至少选择一条相关舆情');
      return;
    }
    onSubmit({
      title,
      companyId,
      importance,
      newsIds: selectedNewsIds,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ minWidth: 550 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{initialData ? '编辑事件' : '创建事件'}</h3>
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
                  setSelectedNewsIds([]);
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">重要性</label>
              <select
                className="form-select"
                value={importance}
                onChange={(e) => setImportance(e.target.value as 'high' | 'medium' | 'low')}
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">事件标题</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：茅台批价持续下行事件"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              关联舆情 ({selectedNewsIds.length} 条已选)
            </label>
            <div style={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              padding: 4,
            }}>
              {availableNews.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <div className="empty-state-text" style={{ fontSize: 12 }}>
                    该公司暂无可关联的舆情
                  </div>
                </div>
              ) : (
                availableNews.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: 6,
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: selectedNewsIds.includes(n.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    }}
                    onClick={() => toggleNews(n.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNewsIds.includes(n.id)}
                      readOnly
                      style={{ marginTop: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {n.source} · {new Date(n.publishTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {initialData ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
