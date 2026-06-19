import { useState } from 'react';
import { X } from 'lucide-react';
import type { WatchItem, WatchItemType } from '../../types';
import { WATCH_ITEM_TYPES } from '../../types';

interface WatchItemModalProps {
  companyName: string;
  onClose: () => void;
  onSubmit: (data: Omit<WatchItem, 'id'>) => void;
}

export default function WatchItemModal({ companyName, onClose, onSubmit }: WatchItemModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<WatchItemType>('other');
  const [description, setDescription] = useState('');

  const handleTypeChange = (newType: WatchItemType) => {
    setType(newType);
    if (!name) {
      setName(WATCH_ITEM_TYPES[newType]);
    }
  };

  const handleSubmit = () => {
    if (!name) {
      alert('请填写观察项名称');
      return;
    }
    onSubmit({
      name,
      type,
      description,
      enabled: true,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">为 {companyName} 添加观察项</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">观察项类型</label>
            <select
              className="form-select"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as WatchItemType)}
            >
              {Object.entries(WATCH_ITEM_TYPES).map(([t, label]) => (
              <option key={t} value={t}>{label as string}</option>
            ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">观察项名称</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：经销商库存"
            />
          </div>

          <div className="form-group">
            <label className="form-label">描述说明</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="说明具体关注什么..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>添加</button>
        </div>
      </div>
    </div>
  );
}
