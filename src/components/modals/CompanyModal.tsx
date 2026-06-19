import { useState } from 'react';
import { X } from 'lucide-react';
import type { Company, WatchItem, WatchItemType } from '../../types';
import { WATCH_ITEM_TYPES } from '../../types';
import { generateId } from '../../utils';

interface CompanyModalProps {
  initialData?: Company;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    name: string;
    industry: string;
    portfolio: string;
    position: number;
    watchItems: WatchItem[];
  }) => void;
}

export default function CompanyModal({ initialData, onClose, onSubmit }: CompanyModalProps) {
  const [code, setCode] = useState(initialData?.code || '');
  const [name, setName] = useState(initialData?.name || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [portfolio, setPortfolio] = useState(initialData?.portfolio || '核心持仓');
  const [position, setPosition] = useState(initialData?.position?.toString() || '0');
  const [watchItems, setWatchItems] = useState<WatchItem[]>(
    initialData?.watchItems || [
      { id: generateId('w'), name: '订单传闻', type: 'order_rumor', enabled: true, description: '' },
      { id: generateId('w'), name: '政策利好', type: 'policy_benefit', enabled: true, description: '' },
      { id: generateId('w'), name: '财务质疑', type: 'financial_doubt', enabled: false, description: '' },
    ]
  );

  const handleSubmit = () => {
    if (!code || !name) {
      alert('请填写股票代码和公司名称');
      return;
    }
    onSubmit({
      code,
      name,
      industry,
      portfolio,
      position: parseFloat(position) || 0,
      watchItems,
    });
  };

  const addWatchItem = () => {
    setWatchItems([
      ...watchItems,
      { id: generateId('w'), name: '', type: 'other', enabled: true, description: '' },
    ]);
  };

  const updateWatchItem = (id: string, field: keyof WatchItem, value: unknown) => {
    setWatchItems(
      watchItems.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  const removeWatchItem = (id: string) => {
    setWatchItems(watchItems.filter((w) => w.id !== id));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ minWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{initialData ? '编辑标的' : '添加标的'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">股票代码</label>
              <input
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="如：600519"
              />
            </div>
            <div className="form-group">
              <label className="form-label">公司名称</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：贵州茅台"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">所属行业</label>
              <input
                className="form-input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="如：食品饮料"
              />
            </div>
            <div className="form-group">
              <label className="form-label">所属组合</label>
              <select
                className="form-select"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
              >
                <option value="核心持仓">核心持仓</option>
                <option value="成长赛道">成长赛道</option>
                <option value="价值蓝筹">价值蓝筹</option>
                <option value="观察池">观察池</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">持仓占比 (%)</label>
            <input
              className="form-input"
              type="number"
              step="0.1"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="如：8.5"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>重点观察项</label>
              <button className="btn btn-secondary btn-sm" type="button" onClick={addWatchItem}>
                + 添加
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              {watchItems.map((item, index) => (
                <div key={item.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => updateWatchItem(item.id, 'enabled', e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <select
                    className="form-select"
                    value={item.type}
                    onChange={(e) => {
                      const type = e.target.value as WatchItemType;
                      updateWatchItem(item.id, 'type', type);
                      updateWatchItem(item.id, 'name', WATCH_ITEM_TYPES[type]);
                    }}
                    style={{ flex: 1 }}
                  >
                    {Object.entries(WATCH_ITEM_TYPES).map(([type, label]) => (
                      <option key={type} value={type}>{label as string}</option>
                    ))}
                  </select>
                  <input
                    className="form-input"
                    value={item.name}
                    onChange={(e) => updateWatchItem(item.id, 'name', e.target.value)}
                    placeholder="名称"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeWatchItem(item.id)}
                    disabled={watchItems.length <= 1}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {initialData ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
