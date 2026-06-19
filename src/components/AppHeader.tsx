import { useState } from 'react';
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
} from 'lucide-react';
import CompanyModal from './modals/CompanyModal';
import { generateId } from '../utils';
import type { Company, WatchItem, Opinion } from '../types';
import { OPINION_TYPES } from '../types';
import './AppHeader.css';

const FILTER_MODES: Array<{
  mode: MorningFilterMode;
  label: string;
  icon: typeof Sun;
  color: string;
}> = [
  { mode: 'all', label: '全部重点', icon: Sun, color: '#f59e0b' },
  { mode: 'core_portfolio', label: '核心持仓', icon: Layers, color: '#3b82f6' },
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
  const companies = useStore((s) => s.companies);
  const events = useStore((s) => s.events);
  const news = useStore((s) => s.news);
  const opinions = useStore((s) => s.opinions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const buildEventReport = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return '';
    const company = companies.find((c) => c.id === event.companyId);
    const relatedOpinions = opinions.filter((o) => o.eventId === eventId);
    const relatedNews = news.filter((n) => event.newsIds.includes(n.id));

    let text = '';
    text += `### ${company?.name || '未知'} - ${event.title}\n\n`;
    text += `- 重要性：${event.importance === 'high' ? '高' : event.importance === 'medium' ? '中' : '低'}\n`;
    text += `- 情感：${event.sentiment === 'positive' ? '正面' : event.sentiment === 'negative' ? '负面' : '中性'}\n`;
    text += `- 时间：${formatDate(event.startTime, 'HH:mm')} - ${formatDate(event.endTime, 'HH:mm')}\n`;
    text += `- 关联舆情：${event.newsIds.length}条\n`;

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
      text += `- 舆情摘要：\n`;
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

  const handleExportMorning = async () => {
    const date = formatDate(currentDate);
    const today = date;

    const relevantEventIds = new Set<string>();
    const relevantCompanyIds = new Set<string>();

    for (const ev of events) {
      if (formatDate(ev.startTime) !== today) continue;
      if (morningFilterMode === 'all') {
        if (ev.importance === 'high') relevantEventIds.add(ev.id);
      } else if (morningFilterMode === 'core_portfolio') {
        const company = companies.find((c) => c.id === ev.companyId);
        if (company?.portfolio === '核心持仓') relevantEventIds.add(ev.id);
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
      if (morningFilterMode === 'need_verify' && op.type === 'need_verify') {
        relevantCompanyIds.add(op.companyId);
        if (op.eventId) relevantEventIds.add(op.eventId);
      }
      if (morningFilterMode === 'risk_warning' && op.type === 'risk_warning') {
        relevantCompanyIds.add(op.companyId);
        if (op.eventId) relevantEventIds.add(op.eventId);
      }
      if (morningFilterMode === 'core_portfolio') {
        const company = companies.find((c) => c.id === op.companyId);
        if (company?.portfolio === '核心持仓') relevantCompanyIds.add(op.companyId);
      }
    }

    if (morningFilterMode === 'core_portfolio') {
      for (const c of companies) {
        if (c.portfolio === '核心持仓') relevantCompanyIds.add(c.id);
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
    } else if (morningFilterMode === 'core_portfolio') {
      report += `> 筛选维度：核心持仓组合（含待讨论事件、观点沉淀）\n\n`;
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

    await doExport(report, `晨会讨论清单_${date}.md`);
    setShowExportMenu(false);
  };

  const handleExportClose = async () => {
    const date = formatDate(currentDate);
    const today = date;

    const todayEvents = events.filter((e) => formatDate(e.startTime) === today);
    const todayOpinions = opinions.filter((o) => formatDate(o.createdAt) === today);

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

    let report = `# 收盘舆情复盘报告 - ${date}\n\n`;
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

    await doExport(report, `收盘舆情复盘_${date}.md`);
    setShowExportMenu(false);
  };

  const doExport = async (content: string, filename: string) => {
    if (window.electronAPI?.exportReport) {
      const result = await window.electronAPI.exportReport(content);
      if (result.success) {
        alert(`报告已导出至：${result.path}`);
      }
    } else {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
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
            {FILTER_MODES.map(({ mode, label, icon: Icon, color }) => (
              <button
                key={mode}
                className={`morning-filter-chip ${morningFilterMode === mode ? 'active' : ''}`}
                onClick={() => setMorningFilterMode(mode)}
                style={morningFilterMode === mode ? { borderColor: color, color, background: `${color}15` } : {}}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
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
    </>
  );
}
