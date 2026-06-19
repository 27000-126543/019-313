import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatDate } from '../utils';
import { Calendar, Sun, FileText, Download, Settings, Plus } from 'lucide-react';
import CompanyModal from './modals/CompanyModal';
import { generateId } from '../utils';
import type { Company, WatchItem } from '../types';

export default function AppHeader() {
  const currentDate = useStore((s) => s.currentDate);
  const isMorningFilter = useStore((s) => s.isMorningFilter);
  const toggleMorningFilter = useStore((s) => s.toggleMorningFilter);
  const addCompany = useStore((s) => s.addCompany);
  const companies = useStore((s) => s.companies);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleExport = async () => {
    const state = useStore.getState();
    const date = formatDate(currentDate);
    const highImportanceEvents = state.events.filter(
      (e) => e.importance === 'high' && formatDate(e.startTime) === date
    );
    const opinions = state.opinions.filter(
      (o) => formatDate(o.createdAt) === date
    );

    let report = `# 舆情复盘报告 - ${date}\n\n`;
    report += `## 一、今日重要事件（${highImportanceEvents.length}条）\n\n`;

    for (const event of highImportanceEvents) {
      const company = companies.find((c) => c.id === event.companyId);
      const relatedOpinions = opinions.filter((o) => o.eventId === event.id);
      report += `### ${company?.name || '未知'} - ${event.title}\n\n`;
      report += `- 重要性：${event.importance === 'high' ? '高' : event.importance === 'medium' ? '中' : '低'}\n`;
      report += `- 情感倾向：${event.sentiment === 'positive' ? '正面' : event.sentiment === 'negative' ? '负面' : '中性'}\n`;
      report += `- 时间范围：${formatDate(event.startTime, 'HH:mm')} - ${formatDate(event.endTime, 'HH:mm')}\n`;
      report += `- 关联舆情：${event.newsIds.length}条\n`;
      if (relatedOpinions.length > 0) {
        report += `- 研究观点：\n`;
        for (const op of relatedOpinions) {
          report += `  - ${op.content}\n`;
        }
      }
      report += '\n';
    }

    report += `## 二、研究观点汇总（${opinions.length}条）\n\n`;
    for (const opinion of opinions) {
      const company = companies.find((c) => c.id === opinion.companyId);
      report += `### ${company?.name || '未知'}\n\n`;
      report += `- 类型：${opinion.type}\n`;
      report += `- 内容：${opinion.content}\n`;
      if (opinion.reportRef) {
        report += `- 关联研报：${opinion.reportRef}\n`;
      }
      report += '\n';
    }

    if (window.electronAPI?.exportReport) {
      const result = await window.electronAPI.exportReport(report);
      if (result.success) {
        alert(`报告已导出至：${result.path}`);
      }
    } else {
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `舆情复盘_${date}.md`;
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
        <button
          className={`btn ${isMorningFilter ? 'btn-primary' : 'btn-secondary'}`}
          onClick={toggleMorningFilter}
          title="晨会模式：筛选高重要性事件"
        >
          <Sun size={14} />
          晨会筛选
        </button>
        <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
          <Plus size={14} />
          添加标的
        </button>
        <button className="btn btn-secondary" onClick={handleExport}>
          <Download size={14} />
          导出复盘
        </button>
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
