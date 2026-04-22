'use client';
import React, { useState, useEffect } from 'react';

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

// Valide le format HH:MM en 24h
function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export default function PlatformEditCard({ id, title, data, onChange, maxLength }: PlatformEditCardProps) {
  const charCount = data.description.length;
  const charPct = charCount / maxLength;
  const charColor = charPct >= 1 ? 'var(--red)' : charPct >= 0.9 ? '#e8a050' : 'var(--text-muted)';

  // Sépare "YYYY-MM-DDTHH:MM" en date et heure
  const datePart = data.date ? data.date.slice(0, 10) : '';
  const timePart = data.date ? data.date.slice(11, 16) : '';

  // État local pour le champ texte heure (permet la saisie libre sans reset)
  const [timeInput, setTimeInput] = useState(timePart);
  const [timeError, setTimeError] = useState(false);

  // Sync si la prop date change de l'extérieur
  useEffect(() => {
    setTimeInput(timePart);
    setTimeError(false);
  }, [timePart]);

  const handleDatePart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const t = timeInput && isValidTime(timeInput) ? timeInput : '00:00';
    const combined = newDate ? `${newDate}T${t}` : '';
    onChange({ ...data, date: combined });
  };

  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTimeInput(val);

    if (isValidTime(val)) {
      setTimeError(false);
      const combined = datePart ? `${datePart}T${val}` : '';
      onChange({ ...data, date: combined });
    } else {
      setTimeError(val.length > 0);
    }
  };

  // Auto-formater quand on quitte le champ (ex: "930" → "09:30")
  const handleTimeBlur = () => {
    let val = timeInput.replace(/[^0-9]/g, '');
    if (val.length === 3) val = `0${val[0]}:${val.slice(1)}`;
    else if (val.length === 4) val = `${val.slice(0, 2)}:${val.slice(2)}`;
    else if (val.length === 1 || val.length === 2) val = `${val.padStart(2, '0')}:00`;

    if (isValidTime(val)) {
      setTimeInput(val);
      setTimeError(false);
      const combined = datePart ? `${datePart}T${val}` : '';
      onChange({ ...data, date: combined });
    } else if (timeInput) {
      setTimeError(true);
    }
  };

  return (
    <div className="edit-card platform-card-inner glass-panel">
      <h4 style={{ marginBottom: '0.75rem', color: '#fff' }}>{title}</h4>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" style={{ fontSize: '0.8rem' }}>Date et heure de Paris</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Date picker — standard, fonctionne partout */}
          <input
            id={`${id}-date`}
            type="date"
            className="form-input"
            value={datePart}
            onChange={handleDatePart}
            style={{ flex: '1 1 58%' }}
          />
          {/* Heure en texte libre — toujours en 24h, pas de reset AM/PM */}
          <input
            id={`${id}-time`}
            type="text"
            inputMode="numeric"
            className="form-input"
            value={timeInput}
            onChange={handleTimeInput}
            onBlur={handleTimeBlur}
            placeholder="14:30"
            maxLength={5}
            style={{
              flex: '1 1 42%',
              borderColor: timeError ? 'var(--red)' : undefined,
              fontFamily: 'monospace',
              fontSize: '1rem',
              letterSpacing: '0.05em',
            }}
          />
        </div>
        {timeError ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--red)', marginTop: '0.25rem', display: 'block' }}>
            ⚠️ Format invalide — entrez HH:MM (ex: 14:30)
          </span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            ⏰ Heure de Paris, format 24h (ex&nbsp;: 14:30)
          </span>
        )}
      </div>

      <div className="form-group" style={{ marginBottom: '0' }}>
        <label className="form-label" style={{ fontSize: '0.8rem' }}>Description</label>
        <textarea
          className="form-textarea"
          rows={6}
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
