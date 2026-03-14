'use client';

import { useCallback, useRef, useState } from 'react';

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
}

export default function PlatformCard({ id, icon, iconClass, title, data, onChange, placeholder }: PlatformCardProps) {
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...data, description: e.target.value });
  }, [data, onChange]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, date: e.target.value });
  }, [data, onChange]);

  return (
    <div className="platform-card">
      <div className="platform-card-inner">
        <div className="platform-card-header">
          <div className={`platform-icon ${iconClass}`}>{icon}</div>
          <h3>{title}</h3>
        </div>
      <div className="form-group">
        <label htmlFor={`${id}-desc`} className="form-label">Description optimisée</label>
        <textarea
          id={`${id}-desc`}
          className="form-textarea"
          rows={4}
          value={data.description}
          onChange={handleDescriptionChange}
          placeholder={placeholder}
        />
        <span className="char-count">{data.description.length} caractères</span>
      </div>
      <div className="form-group">
        <label htmlFor={`${id}-date`} className="form-label">Date et heure de publication</label>
        <input
          id={`${id}-date`}
          type="datetime-local"
          className="form-input"
          value={data.date}
          onChange={handleDateChange}
        />
      </div>
      </div>
    </div>
  );
}
