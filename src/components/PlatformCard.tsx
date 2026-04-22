'use client';

import { useCallback } from 'react';

interface PlatformData {
  description: string;
  date: string;
}

interface PlatformCardProps {
  id: string;
  icon: string;
  iconClass: string;
  title: string;
  data: PlatformData;
  onChange: (data: PlatformData) => void;
  placeholder: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  maxLength: number;
}

export default function PlatformCard({ id, icon, iconClass, title, data, onChange, placeholder, enabled, onToggle, maxLength }: PlatformCardProps) {
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...data, description: e.target.value });
  }, [data, onChange]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, date: e.target.value });
  }, [data, onChange]);

  const charCount = data.description.length;
  const charPct = charCount / maxLength;
  const charColor = charPct >= 1 ? 'var(--red)' : charPct >= 0.9 ? '#e8a050' : 'var(--text-muted)';

  return (
    <div className={`platform-card${enabled ? '' : ' platform-card--disabled'}`}>
      <div className="platform-card-inner">
        <div className="platform-card-header">
          <div className={`platform-icon ${iconClass}`}>{icon}</div>
          <h3>{title}</h3>
          {/* Toggle switch */}
          <label className="platform-toggle" title={enabled ? 'Désactiver' : 'Activer'}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => onToggle(e.target.checked)}
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
          </label>
        </div>

        {/* Content — grisé si désactivé */}
        <div className={`platform-card-body${enabled ? '' : ' platform-card-body--disabled'}`}>
          {!enabled && (
            <div className="platform-card-overlay">
              <span>Désactivé — pas de publication</span>
            </div>
          )}
          <div className="form-group">
            <label htmlFor={`${id}-desc`} className="form-label">Description optimisée</label>
            <textarea
              id={`${id}-desc`}
              className="form-textarea"
              rows={8}
              value={data.description}
              onChange={handleDescriptionChange}
              placeholder={placeholder}
              disabled={!enabled}
              maxLength={maxLength}
            />
            <span className="char-count" style={{ color: charColor }}>
              {charCount} / {maxLength} caractères{charPct >= 1 ? ' — limite atteinte ⚠️' : ''}
            </span>
          </div>
          <div className="form-group">
            <label htmlFor={`${id}-date`} className="form-label">Date et heure de publication</label>
            <input
              id={`${id}-date`}
              type="datetime-local"
              className="form-input"
              value={data.date}
              onChange={handleDateChange}
              disabled={!enabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
