import React from 'react';

interface PlatformData {
  description: string;
  date: string;
}

interface PlatformEditCardProps {
  id: string;
  title: string;
  data: PlatformData;
  onChange: (data: PlatformData) => void;
}

export default function PlatformEditCard({ id, title, data, onChange }: PlatformEditCardProps) {
  return (
    <div className="edit-card platform-card-inner glass-panel">
      <h4 style={{marginBottom: '0.75rem', color: '#fff'}}>{title}</h4>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" style={{ fontSize: '0.8rem' }}>Date (Heure de Paris)</label>
        <input 
          type="datetime-local" 
          className="form-input" 
          value={data.date} 
          onChange={e => onChange({ ...data, date: e.target.value })} 
        />
      </div>
      <div className="form-group" style={{ marginBottom: '0' }}>
        <label className="form-label" style={{ fontSize: '0.8rem' }}>Description</label>
        <textarea 
          className="form-textarea" 
          rows={3}
          value={data.description} 
          onChange={e => onChange({ ...data, description: e.target.value })} 
        />
      </div>
    </div>
  );
}
