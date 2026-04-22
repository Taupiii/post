import React from 'react';

interface PlatformData {
  description: string;
  date: string; // format: "YYYY-MM-DDTHH:MM"
}

interface PlatformEditCardProps {
  id: string;
  title: string;
  data: PlatformData;
  onChange: (data: PlatformData) => void;
  maxLength: number;
}

export default function PlatformEditCard({ id, title, data, onChange, maxLength }: PlatformEditCardProps) {
  const charCount = data.description.length;
  const charPct = charCount / maxLength;
  const charColor = charPct >= 1 ? 'var(--red)' : charPct >= 0.9 ? '#e8a050' : 'var(--text-muted)';

  // Sépare "YYYY-MM-DDTHH:MM" en date et heure
  const datePart = data.date ? data.date.slice(0, 10) : '';
  const timePart = data.date ? data.date.slice(11, 16) : '';

  const handleDatePart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const combined = newDate && timePart ? `${newDate}T${timePart}` : newDate ? `${newDate}T00:00` : '';
    onChange({ ...data, date: combined });
  };

  const handleTimePart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const combined = datePart && newTime ? `${datePart}T${newTime}` : '';
    onChange({ ...data, date: combined });
  };

  return (
    <div className="edit-card platform-card-inner glass-panel">
      <h4 style={{ marginBottom: '0.75rem', color: '#fff' }}>{title}</h4>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" style={{ fontSize: '0.8rem' }}>Date et heure de Paris</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id={`${id}-date`}
            type="date"
            className="form-input"
            value={datePart}
            onChange={handleDatePart}
            style={{ flex: '1 1 60%' }}
          />
          <input
            id={`${id}-time`}
            type="time"
            className="form-input"
            value={timePart}
            onChange={handleTimePart}
            step={60}
            style={{ flex: '1 1 40%' }}
          />
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
          ⏰ Heure de Paris (UTC+2 en été, UTC+1 en hiver)
        </span>
      </div>

      <div className="form-group" style={{ marginBottom: '0' }}>
        <label className="form-label" style={{ fontSize: '0.8rem' }}>Description</label>
        <textarea
          className="form-textarea"
          rows={3}
          value={data.description}
          maxLength={maxLength}
          onChange={e => onChange({ ...data, description: e.target.value })}
        />
        <span className="char-count" style={{ color: charColor }}>
          {charCount} / {maxLength} caractères{charPct >= 1 ? ' — limite atteinte ⚠️' : ''}
        </span>
      </div>
    </div>
  );
}
