import { useState, useMemo } from 'react';
import { useStore, MorningFilterMode } from '../store/useStore';
import { formatDate } from '../utils';
import {
  Calendar,
  Sun,
  Download,
  Settings,
  Plus,
  Layers,
  TrendingDown,
  Phone,
  AlertTriangle,
  FileDown,
  X,
  History,
  FolderOpen,
  Clock,
  Trash2,
  Briefcase,
} from 'lucide-react';
import CompanyModal from './modals/CompanyModal';
import { generateId } from '../utils';
import type { Company, WatchItem, Opinion, ExportType } from '../types';
import { OPINION_TYPES } from '../types';
import './AppHeader.css';

const BASE_FILTER_MODES: Array<{
  mode: MorningFilterMode;
  label: string;
  icon: typeof Sun;
  color: string;
}> = [
  { mode: 'all', label: '全部重点', icon: Sun, color: '#f59e0b' },
  { mode: 'negative_sentiment', label: '负面舆情', icon: TrendingDown, color: '#ef4444' },
  { mode: 'need_verify', label: '需电话核实', icon: Phone, color: '#f97316' },
  { mode: 'risk_warning', label: '风险提示', icon: AlertTriangle, color: '#dc2626' },
];

export default function AppHeader() {
  const currentDate = useStore((s) => s.currentDate);
  const morningFilterMode = useStore((s) => s.morningFilterMode);
  const isMorningFilter = useStore((s) => s.isMorningFilter);
  const setMorningFilterMode = useStore((s) => s.setMorningFilterMode);
  const toggleMorningFilter = useStore((s) => s.toggleMorningFilter);
  const addCompany = useStore((s) => s.addCompany);
  const addExportRecord = useStore((s) => s.addExportRecord);
  const clearExportHistory = useStore((s) => s.clearExportHistory);
  const companies = useStore((s) => s.companies);
  const events = useStore((s) => s.events);
  const news = useStore((s) => s.news);
  const opinions = useStore((s) => s.opinions);
  const exportHistory = useStore((s) => s.exportHistory);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportHistory, setShowExportHistory] = useState(false);

  const portfolios = useMemo(
    () => [...new Set(companies.map((c) => c.portfolio))],
    [companies]
  );

  const allFilterModes = useMemo(() => {
    const portfolioModes = portfolios.map((p) => ({
      mode: `portfolio:${p}` as MorningFilterMode,
      label: p,
      icon: Briefcase,
      color: '#8b5cf6',
    }));
    return [...BASE_FILTER_MODES, ...portfolioModes];
  }, [portfolios]);

  const getActivePortfolio = (): string | null => {
    if (typeof morningFilterMode === 'string' && morningFilterMode.startsWith('portfolio:')) {
      return morningFilterMode.replace('portfolio:', '');
    }
    return null;
  };

  const buildEventReport = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return '';
    const company = companies.find((c) => c.id === event.companyId);
    const relatedOpinions = opinions.filter((o) => o.eventId === eventId);
    const relatedNews = news
      .filter((n) => event.newsIds.includes(n.id))
      .sort((a, b) => new Date(a.publishTime).getTime() - new Date(b.publishTime).getTime());

    let text = '';
    text += `### ${company?.name || '未知'} - ${event.title}\n\n`;
    text += `- 重要性：${event.importance === 'high' ? '高' : event.importance === 'medium' ? '中' : '低'}\n`;
    text += `- 情感：${event.sentiment === 'positive' ? '正面' : event.sentiment === 'negative' ? '负面' : '中性'}\n`;
    text += `- 时间：${formatDate(event.startTime, 'HH:mm')} - ${formatDate(event.endTime, 'HH:mm')}\n`;
    text += `- 关联舆情：${event.newsIds.length}条\n`;
    text += `- 标签：${event.tags.join('、') || '无'}\n`;

    if (event.conclusion) {
      if (event.conclusion.coreJudgment) {
        text += `- 核心判断：${event.conclusion.coreJudgment}\n`;
      }
      if (event.conclusion.impactScope) {
        text += `- 影响范围：${event.conclusion.impactScope}\n`;
      }
      if (event.conclusion.followUpTime) {
        text += `- 跟踪时间：${event.conclusion.followUpTime}\n`;
      }
    }

    if (relatedOpinions.length > 0) {
      text += `- 研究观点：\n`;
      for (const op of relatedOpinions) {
        text += `  - [${OPINION_TYPES[op.type].label}] ${op.content}`;
        if (op.reportRef) text += `  (${op.reportRef})`;
        text += `\n`;
      }
    }

    if (relatedNews.length > 0) {
      text += `- 舆情摘要（按时间顺序）：\n`;
      for (const n of relatedNews) {
        text += `  - ${formatDate(n.publishTime, 'HH:mm')} ${n.source}：${n.title}\n`;
      }
    }
    text += '\n';
    return text;
  };

  const buildOpinionReport = (op: Opinion) => {
    const company = companies.find((c) => c.id === op.companyId);
    let text = `- [${OPINION_TYPES[op.type].label}] ${company?.name || '未知'}：${op.content}`;
    if (op.reportRef) text += `  (${op.reportRef})`;
    text += '\n';
    return text;
  };

  const generateUniqueFilename = (baseName: string, date: string): string => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    return `${baseName}_${date}_${timeStr}.md`;
  };

  const handleExportMorning = async () => {
    const date = formatDate(currentDate);
    const today = date;
    const activePortfolio = getActivePortfolio();

    const relevantEventIds = new Set<string>();
    const relevantCompanyIds = new Set<string>();

    for (const ev of events) {
      if (formatDate(ev.startTime) !== today) continue;
      const company = companies.find((c) => c.id === ev.companyId);

      if (morningFilterMode === 'all') {
        if (ev.importance === 'high') relevantEventIds.add(ev.id);
      } else if (activePortfolio) {
        if (company?.portfolio === activePortfolio) relevantEventIds.add(ev.id);
      } else if (morningFilterMode === 'negative_sentiment') {
        if (ev.sentiment === 'negative') relevantEventIds.add(ev.id);
      } else if (morningFilterMode === 'need_verify' || morningFilterMode === 'risk_warning') {
        const type = morningFilterMode;
        const match = opinions.find(
          (o) => o.eventId === ev.id && o.type === type && formatDate(o.createdAt) === today
        );
        if (match) relevantEventIds.add(ev.id);
      }
    }

    for (const op of opinions) {
      if (formatDate(op.createdAt) !== today) continue;
      const company = companies.find((c) => c.id === op.companyId);

      if (morningFilterMode === 'need_verify' && op.type === 'need_verify') {
        relevantCompanyIds.add(op.companyId);
        if (op.eventId) relevantEventIds.add(op.eventId);
      }
      if (morningFilterMode === 'risk_warning' && op.type === 'risk_warning') {
        relevantCompanyIds.add(op.companyId);
        if (op.eventId) relevantEventIds.add(op.eventId);
      }
      if (activePortfolio && company?.portfolio === activePortfolio) {
        relevantCompanyIds.add(op.companyId);
      }
    }

    if (activePortfolio) {
      for (const c of companies) {
        if (c.portfolio === activePortfolio) relevantCompanyIds.add(c.id);
      }
    }

    const todayNewsNegative = news.filter(
      (n) => formatDate(n.publishTime) === today && n.sentiment === 'negative'
    );
    if (morningFilterMode === 'negative_sentiment') {
      todayNewsNegative.forEach((n) => relevantCompanyIds.add(n.companyId));
    }

    let report = `# 晨会讨论清单 - ${date}\n\n`;

    if (morningFilterMode === 'all') {
      report += `> 筛选维度：今日全部高重要性事件\n\n`;
    } else if (activePortfolio) {
      report += `> 筛选维度：${activePortfolio}组合（含待讨论事件、观点沉淀）\n\n`;
    } else if (morningFilterMode === 'negative_sentiment') {
      report += `> 筛选维度：今日负面舆情（需关注风险）\n\n`;
    } else if (morningFilterMode === 'need_verify') {
      report += `> 筛选维度：需电话核实事项（建议晨会前联系IR）\n\n`;
    } else if (morningFilterMode === 'risk_warning') {
      report += `> 筛选维度：风险提示事项（组合层面风险）\n\n`;
    }

    report += `## 一、待讨论事件（${relevantEventIds.size}条）\n\n`;
    if (relevantEventIds.size === 0) {
      report += `_暂无符合条件的事件_\n\n`;
    } else {
      const sortedEvents = [...relevantEventIds]
        .map((id) => events.find((e) => e.id === id))
        .filter(Boolean)
        .sort(
          (a, b) => new Date(b!.startTime).getTime() - new Date(a!.startTime).getTime()
        );
      for (const ev of sortedEvents) {
        report += buildEventReport(ev!.id);
      }
    }

    report += `## 二、需关注公司（${relevantCompanyIds.size}家）\n\n`;
    if (relevantCompanyIds.size === 0) {
      report += `_暂无_\n\n`;
    } else {
      const byPortfolio: Record<string, string[]> = {};
      for (const cid of relevantCompanyIds) {
        const c = companies.find((x) => x.id === cid);
        if (!c) continue;
        if (!byPortfolio[c.portfolio]) byPortfolio[c.portfolio] = [];
        byPortfolio[c.portfolio].push(c.name);
      }
      for (const [portfolio, names] of Object.entries(byPortfolio)) {
        report += `### ${portfolio}（${names.length}家）\n\n`;
        for (const name of names) {
          report += `- ${name}\n`;
        }
        report += '\n';
      }
    }

    report += `## 三、今日待核实/风险观点\n\n`;
    const todoOpinions = opinions.filter(
      (o) =>
        formatDate(o.createdAt) === today &&
        (o.type === 'need_verify' || o.type === 'risk_warning')
    );
    if (todoOpinions.length === 0) {
      report += `_暂无_\n`;
    } else {
      for (const op of todoOpinions) {
        report += buildOpinionReport(op);
      }
    }

    const filename = generateUniqueFilename('晨会讨论清单', date);
    const result = await doExport(report, filename, 'morning');
    if (result?.success) {
      addExportRecord({
        type: 'morning',
        filename,
        path: result.path,
        exportedAt: new Date().toISOString(),
        portfolio: activePortfolio || undefined,
        itemCount: relevantEventIds.size + relevantCompanyIds.size,
      });
    }
    setShowExportMenu(false);
  };

  const handleExportClose = async () => {
    const date = formatDate(currentDate);
    const today = date;
    const activePortfolio = getActivePortfolio();

    let todayEvents = events.filter((e) => formatDate(e.startTime) === today);
    let todayOpinions = opinions.filter((o) => formatDate(o.createdAt) === today);

    if (activePortfolio) {
      const portfolioCompanyIds = companies
        .filter((c) => c.portfolio === activePortfolio)
        .map((c) => c.id);
      todayEvents = todayEvents.filter((e) => portfolioCompanyIds.includes(e.companyId));
      todayOpinions = todayOpinions.filter((o) => portfolioCompanyIds.includes(o.companyId));
    }

    const byPortfolio: Record<string, { events: typeof events; opinions: typeof opinions; companies: Set<string> }> = {};
    for (const ev of todayEvents) {
      const c = companies.find((x) => x.id === ev.companyId);
      if (!c) continue;
      if (!byPortfolio[c.portfolio]) {
        byPortfolio[c.portfolio] = { events: [], opinions: [], companies: new Set() };
      }
      byPortfolio[c.portfolio].events.push(ev);
      byPortfolio[c.portfolio].companies.add(c.id);
    }
    for (const op of todayOpinions) {
      const c = companies.find((x) => x.id === op.companyId);
      if (!c) continue;
      if (!byPortfolio[c.portfolio]) {
        byPortfolio[c.portfolio] = { events: [], opinions: [], companies: new Set() };
      }
      byPortfolio[c.portfolio].opinions.push(op);
      byPortfolio[c.portfolio].companies.add(c.id);
    }

    let reportTitle = '收盘舆情复盘报告';
    if (activePortfolio) {
      reportTitle = `${activePortfolio} - 收盘舆情复盘报告`;
    }

    let report = `# ${reportTitle} - ${date}\n\n`;
    report += `> 按投资组合汇总今日风险与观点沉淀，用于盘后复盘与周报复盘参考。\n\n`;

    report += `## 总览\n\n`;
    report += `- 今日事件：${todayEvents.length} 条（高重要 ${todayEvents.filter((e) => e.importance === 'high').length}）\n`;
    report += `- 今日观点：${todayOpinions.length} 条\n`;
    report += `- 涉及公司：${new Set([...todayEvents.map((e) => e.companyId), ...todayOpinions.map((o) => o.companyId)]).size} 家\n\n`;

    for (const [portfolio, data] of Object.entries(byPortfolio)) {
      report += `---\n\n`;
      report += `## ${portfolio}（涉及 ${data.companies.size} 家公司）\n\n`;

      if (data.events.length > 0) {
        const sorted = [...data.events].sort(
          (a, b) =>
            (b.importance === 'high' ? 2 : b.importance === 'medium' ? 1 : 0) -
            (a.importance === 'high' ? 2 : a.importance === 'medium' ? 1 : 0)
        );
        report += `### 事件复盘（${data.events.length}条）\n\n`;
        for (const ev of sorted) {
          report += buildEventReport(ev.id);
        }
      }

      if (data.opinions.length > 0) {
        report += `### 观点沉淀（${data.opinions.length}条）\n\n`;
        const byType: Record<string, Opinion[]> = {};
        for (const op of data.opinions) {
          if (!byType[op.type]) byType[op.type] = [];
          byType[op.type].push(op);
        }
        for (const [type, list] of Object.entries(byType)) {
          report += `#### ${OPINION_TYPES[type as keyof typeof OPINION_TYPES]?.label || type}\n\n`;
          for (const op of list) {
            report += buildOpinionReport(op);
          }
          report += '\n';
        }
      }

      if (data.events.length === 0 && data.opinions.length === 0) {
        report += `_今日无舆情与观点更新_\n\n`;
      }
    }

    const uncategorizedEvents = todayEvents.filter(
      (e) => !companies.find((c) => c.id === e.companyId) || !byPortfolio[companies.find((c) => c.id === e.companyId)!.portfolio]
    );
    if (uncategorizedEvents.length > 0) {
      report += `---\n\n`;
      report += `## 其他\n\n`;
      for (const ev of uncategorizedEvents) {
        report += buildEventReport(ev.id);
      }
    }

    const filename = generateUniqueFilename(activePortfolio ? `收盘复盘_${activePortfolio}` : '收盘舆情复盘', date);
    const result = await doExport(report, filename, 'close');
    if (result?.success) {
      addExportRecord({
        type: 'close',
        filename,
        path: result.path,
        exportedAt: new Date().toISOString(),
        portfolio: activePortfolio || undefined,
        itemCount: todayEvents.length + todayOpinions.length,
      });
    }
    setShowExportMenu(false);
  };

  const doExport = async (
    content: string,
    filename: string,
    _type: ExportType
  ): Promise<{ success: boolean; path: string } | null> => {
    if (window.electronAPI?.exportReport) {
      const result = await window.electronAPI.exportReport(content, filename);
      if (result.success) {
        alert(`报告已导出至：${result.path}`);
        return { success: true, path: result.path };
      }
      return null;
    } else {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, path: `下载/${filename}` };
    }
  };

  const handleAddCompany = (data: { code: string; name: string; industry: string; portfolio: string; position: number; watchItems: WatchItem[] }) => {
    const newCompany: Company = {
      id: generateId('comp'),
      code: data.code,
      name: data.name,
      industry: data.industry,
      portfolio: data.portfolio,
      position: data.position,
      watchItems: data.watchItems,
      createdAt: new Date().toISOString(),
    };
    addCompany(newCompany);
    setShowAddModal(false);
  };

  const openFolder = (path: string) => {
    if (window.electronAPI?.openPath) {
      window.electronAPI.openPath(path);
    } else {
      alert(`文件路径：${path}`);
    }
  };

  return (
    <>
      <header className="app-header">
        <h1>舆情复盘工作站</h1>
        <div className="header-date">
          <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          {formatDate(currentDate, 'YYYY年MM月DD日')}
        </div>
        <div className="header-spacer" />

        {isMorningFilter && (
          <div className="morning-filter-bar">
            {allFilterModes.map(({ mode, label, icon: Icon, color }) => {
              const isActive =
                (mode.startsWith('portfolio:') && getActivePortfolio() === mode.replace('portfolio:', '')) ||
                (!mode.startsWith('portfolio:') && morningFilterMode === mode);
              return (
                <button
                  key={mode}
                  className={`morning-filter-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setMorningFilterMode(mode)}
                  style={isActive ? { borderColor: color, color, background: `${color}15` } : {}}
                >
                  <Icon size={12} />
                  {label}
                </button>
              );
            })}
            <button
              className="morning-filter-chip close-chip"
              onClick={toggleMorningFilter}
            >
              <X size={12} />
              退出
            </button>
          </div>
        )}

        {!isMorningFilter && (
          <button
            className="btn btn-secondary"
            onClick={toggleMorningFilter}
            title="进入晨会筛选模式"
          >
            <Sun size={14} />
            晨会筛选
          </button>
        )}

        <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
          <Plus size={14} />
          添加标的
        </button>

        <div className="export-wrapper">
          <button
            className="btn btn-secondary"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download size={14} />
            导出复盘
          </button>
          {showExportMenu && (
            <div className="export-menu" onClick={(e) => e.stopPropagation()}>
              <div className="export-menu-title">选择导出模板</div>
              <button className="export-menu-item" onClick={handleExportMorning}>
                <Sun size={14} style={{ color: '#f59e0b' }} />
                <div>
                  <div className="export-menu-item-title">晨会讨论清单</div>
                  <div className="export-menu-item-desc">待讨论持仓公司、需核实事项</div>
                </div>
              </button>
              <button className="export-menu-item" onClick={handleExportClose}>
                <FileDown size={14} style={{ color: '#3b82f6' }} />
                <div>
                  <div className="export-menu-item-title">收盘复盘报告</div>
                  <div className="export-menu-item-desc">按组合汇总风险与观点沉淀</div>
                </div>
              </button>
              <div className="export-menu-divider" />
              <button
                className="export-menu-item"
                onClick={() => {
                  setShowExportMenu(false);
                  setShowExportHistory(true);
                }}
              >
                <History size={14} style={{ color: '#6b7280' }} />
                <div>
                  <div className="export-menu-item-title">导出历史</div>
                  <div className="export-menu-item-desc">查看最近导出的文件记录</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <button className="btn btn-ghost" title="设置">
          <Settings size={16} />
        </button>
      </header>

      {showAddModal && (
        <CompanyModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCompany}
        />
      )}

      {showExportHistory && (
        <div className="modal-overlay" onClick={() => setShowExportHistory(false)}>
          <div className="modal export-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <History size={16} style={{ marginRight: '6px' }} />
                导出历史记录
              </h3>
              <button className="modal-close" onClick={() => setShowExportHistory(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {exportHistory.length === 0 ? (
                <div className="empty-state">
                  <History size={32} className="empty-state-icon" />
                  <div className="empty-state-text">暂无导出记录</div>
                </div>
              ) : (
                <>
                  <div className="export-history-header">
                    <span style={{ flex: 1 }}>文件名</span>
                    <span style={{ width: 80, textAlign: 'center' }}>类型</span>
                    <span style={{ width: 140, textAlign: 'center' }}>导出时间</span>
                    <span style={{ width: 60, textAlign: 'center' }}>数量</span>
                    <span style={{ width: 80, textAlign: 'center' }}>操作</span>
                  </div>
                  <div className="export-history-list">
                    {exportHistory.map((record) => (
                      <div key={record.id} className="export-history-item">
                        <span className="export-history-filename" title={record.path}>
                          <FileDown size={12} style={{ marginRight: '6px', color: record.type === 'morning' ? '#f59e0b' : '#3b82f6' }} />
                          {record.filename}
                        </span>
                        <span className="export-history-type">
                          <span className={`type-badge type-${record.type}`}>
                            {record.type === 'morning' ? '晨会' : '收盘'}
                          </span>
                        </span>
                        <span className="export-history-time">
                          <Clock size={11} style={{ marginRight: '4px' }} />
                          {formatDate(record.exportedAt, 'MM-DD HH:mm')}
                        </span>
                        <span className="export-history-count">{record.itemCount}项</span>
                        <span className="export-history-actions">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openFolder(record.path)}
                            title="打开文件位置"
                          >
                            <FolderOpen size={12} />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {exportHistory.length > 0 && (
              <div className="modal-footer">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm('确定清空所有导出历史记录吗？')) {
                      clearExportHistory();
                    }
                  }}
                >
                  <Trash2 size={12} />
                  清空历史
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
