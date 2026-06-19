import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { WATCH_ITEM_TYPES, SENTIMENT_COLORS } from '../types';
import { formatDate } from '../utils';
import { Building2, Layers, Eye, EyeOff, Trash2, Edit2, ChevronDown, ChevronRight, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import CompanyModal from './modals/CompanyModal';
import WatchItemModal from './modals/WatchItemModal';
import type { Company, WatchItem } from '../types';
import { generateId } from '../utils';
import './PortfolioPanel.css';

export default function PortfolioPanel() {
  const companies = useStore((s) => s.companies);
  const news = useStore((s) => s.news);
  const events = useStore((s) => s.events);
  const opinions = useStore((s) => s.opinions);
  const selectedCompanyId = useStore((s) => s.selectedCompanyId);
  const setSelectedCompany = useStore((s) => s.setSelectedCompany);
  const updateCompany = useStore((s) => s.updateCompany);
  const deleteCompany = useStore((s) => s.deleteCompany);
  const currentDate = useStore((s) => s.currentDate);
  const filterPortfolio = useStore((s) => s.filterPortfolio);
  const filterIndustry = useStore((s) => s.filterIndustry);
  const setFilterPortfolio = useStore((s) => s.setFilterPortfolio);
  const setFilterIndustry = useStore((s) => s.setFilterIndustry);
  const isMorningFilter = useStore((s) => s.isMorningFilter);
  const morningFilterMode = useStore((s) => s.morningFilterMode);

  const [groupBy, setGroupBy] = useState<'portfolio' | 'industry'>('portfolio');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['核心持仓', '成长赛道', '价值蓝筹']));
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [watchItemForCompany, setWatchItemForCompany] = useState<Company | null>(null);

  const portfolios = useMemo(() => [...new Set(companies.map((c) => c.portfolio))], [companies]);
  const industries = useMemo(() => [...new Set(companies.map((c) => c.industry))], [companies]);

  const groupedCompanies = useMemo(() => {
    let filtered = [...companies];
    if (filterPortfolio) {
      filtered = filtered.filter((c) => c.portfolio === filterPortfolio);
    }
    if (filterIndustry) {
      filtered = filtered.filter((c) => c.industry === filterIndustry);
    }

    const groups: Record<string, Company[]> = {};
    filtered.forEach((c) => {
      const key = groupBy === 'portfolio' ? c.portfolio : c.industry;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [companies, groupBy, filterPortfolio, filterIndustry]);

  const toggleGroup = (name: string) => {
    const next = new Set(expandedGroups);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setExpandedGroups(next);
  };

  const getCompanyStats = (companyId: string) => {
    const todayNews = news.filter(
      (n) => n.companyId === companyId && formatDate(n.publishTime) === currentDate
    );
    const todayEvents = events.filter(
      (e) => e.companyId === companyId && formatDate(e.startTime) === currentDate
    );
    const todayOpinions = opinions.filter(
      (o) => o.companyId === companyId && formatDate(o.createdAt) === currentDate
    );

    const sentimentCounts = {
      positive: todayNews.filter((n) => n.sentiment === 'positive').length,
      negative: todayNews.filter((n) => n.sentiment === 'negative').length,
      neutral: todayNews.filter((n) => n.sentiment === 'neutral').length,
    };

    const hasHighImportance = todayEvents.some((e) => e.importance === 'high');
    const highOpinions = todayOpinions.filter(
      (o) => o.type === 'risk_warning' || o.type === 'buy_signal' || o.type === 'need_verify'
    );

    return {
      newsCount: todayNews.length,
      eventCount: todayEvents.length,
      opinionCount: todayOpinions.length,
      sentimentCounts,
      hasHighImportance,
      importantOpinionCount: highOpinions.length,
    };
  };

  const handleEditCompany = (data: { code: string; name: string; industry: string; portfolio: string; position: number; watchItems: WatchItem[] }) => {
    if (!editCompany) return;
    updateCompany({ ...editCompany, ...data });
    setEditCompany(null);
  };

  const handleDeleteCompany = (id: string) => {
    if (confirm('确定要删除此标的吗？相关舆情和观点也会被删除。')) {
      deleteCompany(id);
    }
  };

  const toggleWatchItem = (company: Company, watchItemId: string) => {
    const updated: Company = {
      ...company,
      watchItems: company.watchItems.map((w) =>
        w.id === watchItemId ? { ...w, enabled: !w.enabled } : w
      ),
    };
    updateCompany(updated);
  };

  const handleAddWatchItem = (item: Omit<WatchItem, 'id'>) => {
    if (!watchItemForCompany) return;
    const newItem: WatchItem = { ...item, id: generateId('w') };
    const updated: Company = {
      ...watchItemForCompany,
      watchItems: [...watchItemForCompany.watchItems, newItem],
    };
    updateCompany(updated);
    setWatchItemForCompany(null);
  };

  const handleDeleteWatchItem = (company: Company, watchItemId: string) => {
    const updated: Company = {
      ...company,
      watchItems: company.watchItems.filter((w) => w.id !== watchItemId),
    };
    updateCompany(updated);
  };

  const isCompanyRelevant = (companyId: string) => {
    if (!isMorningFilter) return true;
    const company = companies.find((c) => c.id === companyId);
    if (!company) return false;
    const stats = getCompanyStats(companyId);

    if (typeof morningFilterMode === 'string' && morningFilterMode.startsWith('portfolio:')) {
      const portfolioName = morningFilterMode.replace('portfolio:', '');
      return company.portfolio === portfolioName;
    }

    switch (morningFilterMode) {
      case 'all':
        return stats.hasHighImportance || stats.importantOpinionCount > 0 || stats.sentimentCounts.negative > 0;
      case 'core_portfolio':
        return company.portfolio === '核心持仓';
      case 'negative_sentiment':
        return stats.sentimentCounts.negative > 0 || (stats.eventCount > 0 && events.some((e) => e.companyId === companyId && e.sentiment === 'negative'));
      case 'need_verify':
      case 'risk_warning': {
        const type = morningFilterMode;
        const hasMatchOpinion = opinions.some(
          (o) => o.companyId === companyId && o.type === type && formatDate(o.createdAt) === currentDate
        );
        return hasMatchOpinion;
      }
      default:
        return true;
    }
  };

  return (
    <>
      <aside className="panel portfolio-panel" style={{ width: 340 }}>
        <div className="panel-header">
          <h2 className="panel-title">
            <Building2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            标的分组
          </h2>
          <div className="panel-actions">
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              共 {companies.length} 家
            </span>
          </div>
        </div>

        <div className="tabs">
          <div
            className={`tab ${groupBy === 'portfolio' ? 'active' : ''}`}
            onClick={() => setGroupBy('portfolio')}
          >
            <Layers size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            按组合
          </div>
          <div
            className={`tab ${groupBy === 'industry' ? 'active' : ''}`}
            onClick={() => setGroupBy('industry')}
          >
            <Building2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            按行业
          </div>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={filterPortfolio || ''}
            onChange={(e) => setFilterPortfolio(e.target.value || null)}
          >
            <option value="">全部组合</option>
            {portfolios.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterIndustry || ''}
            onChange={(e) => setFilterIndustry(e.target.value || null)}
          >
            <option value="">全部行业</option>
            {industries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        <div className="panel-content">
          {Object.entries(groupedCompanies).length === 0 ? (
            <div className="empty-state">
              <Building2 size={32} className="empty-state-icon" />
              <div className="empty-state-text">暂无标的</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                添加标的
              </button>
            </div>
          ) : (
            Object.entries(groupedCompanies).map(([groupName, groupCompanies]) => {
              const isExpanded = expandedGroups.has(groupName);
              const visibleCompanies = isMorningFilter
                ? groupCompanies.filter((c) => isCompanyRelevant(c.id))
                : groupCompanies;

              if (isMorningFilter && visibleCompanies.length === 0) {
                return null;
              }

              return (
                <div key={groupName} className="group-section">
                  <div className="group-header" onClick={() => toggleGroup(groupName)}>
                    <span className="group-toggle">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="group-name">{groupName}</span>
                    <span className="group-count">
                      {isMorningFilter ? visibleCompanies.length : groupCompanies.length}/{groupCompanies.length}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="company-list">
                      {(isMorningFilter ? visibleCompanies : groupCompanies).map((company) => {
                        const stats = getCompanyStats(company.id);
                        const isSelected = selectedCompanyId === company.id;
                        const isRelevant = isCompanyRelevant(company.id);

                        return (
                          <div
                            key={company.id}
                            className={`company-card ${isSelected ? 'selected' : ''} ${isRelevant && isMorningFilter ? 'relevant' : ''}`}
                            onClick={() => setSelectedCompany(company.id)}
                          >
                            <div className="company-header">
                              <div className="company-main-info">
                                <span className="company-name">{company.name}</span>
                                <span className="company-code">{company.code}</span>
                              </div>
                              <div className="company-position">
                                {company.position > 0 && (
                                  <span className="position-badge">{company.position.toFixed(1)}%</span>
                                )}
                              </div>
                            </div>

                            {stats.newsCount > 0 && (
                              <div className="company-stats">
                                <span className="stat-item">
                                  <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>今日</span>
                                  {stats.sentimentCounts.positive > 0 && (
                                    <span className="sentiment-dot" style={{ background: SENTIMENT_COLORS.positive }}>
                                      {stats.sentimentCounts.positive}
                                    </span>
                                  )}
                                  {stats.sentimentCounts.negative > 0 && (
                                    <span className="sentiment-dot" style={{ background: SENTIMENT_COLORS.negative }}>
                                      {stats.sentimentCounts.negative}
                                    </span>
                                  )}
                                  {stats.sentimentCounts.neutral > 0 && (
                                    <span className="sentiment-dot" style={{ background: SENTIMENT_COLORS.neutral }}>
                                      {stats.sentimentCounts.neutral}
                                    </span>
                                  )}
                                </span>
                                {stats.eventCount > 0 && (
                                  <span className="stat-item events-badge">
                                    <AlertCircle size={11} />
                                    {stats.eventCount}
                                  </span>
                                )}
                                {stats.opinionCount > 0 && (
                                  <span className="stat-item opinion-badge">
                                    <Eye size={11} />
                                    {stats.opinionCount}
                                  </span>
                                )}
                                {stats.hasHighImportance && (
                                  <span className="importance-indicator high" title="高重要性事件">!</span>
                                )}
                              </div>
                            )}

                            {isSelected && (
                              <div className="company-watch-items">
                                <div className="watch-items-header">
                                  <span className="watch-items-title">重点观察项</span>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setWatchItemForCompany(company);
                                    }}
                                  >
                                    + 添加
                                  </button>
                                </div>
                                {company.watchItems.length === 0 ? (
                                  <div className="empty-state" style={{ padding: 16 }}>
                                    <div className="empty-state-text" style={{ fontSize: 11 }}>暂无观察项</div>
                                  </div>
                                ) : (
                                  company.watchItems.map((item) => (
                                    <div key={item.id} className="watch-item-row">
                                      <button
                                        className="watch-item-toggle"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleWatchItem(company, item.id);
                                        }}
                                      >
                                        {item.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                                      </button>
                                      <span className={`watch-item-name ${item.enabled ? '' : 'disabled'}`}>
                                        {WATCH_ITEM_TYPES[item.type] || item.name}
                                      </span>
                                      <div className="watch-item-actions">
                                        <button
                                          className="btn btn-ghost btn-sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWatchItem(company, item.id);
                                          }}
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                                <div className="company-actions">
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditCompany(company);
                                    }}
                                  >
                                    <Edit2 size={11} />
                                    编辑
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCompany(company.id);
                                    }}
                                  >
                                    <Trash2 size={11} />
                                    删除
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {editCompany && (
        <CompanyModal
          initialData={editCompany}
          onClose={() => setEditCompany(null)}
          onSubmit={handleEditCompany}
        />
      )}

      {watchItemForCompany && (
        <WatchItemModal
          companyName={watchItemForCompany.name}
          onClose={() => setWatchItemForCompany(null)}
          onSubmit={handleAddWatchItem}
        />
      )}
    </>
  );
}
