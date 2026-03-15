'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface PlatformStatus {
  connected: boolean;
  label: string;
}

interface StatusData {
  youtube: PlatformStatus;
  instagram: PlatformStatus;
  tiktok: PlatformStatus;
}

const PLATFORMS = [
  { key: 'instagram' as const, name: 'IG', connectUrl: '/api/instagram/auth' },
  { key: 'tiktok'   as const, name: 'TT', connectUrl: '/api/tiktok/auth' },
  { key: 'youtube'  as const, name: 'YT', connectUrl: '/api/youtube/auth' },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  const handleLogout = useCallback(() => {
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  }, []);

  return (
    <header className="dashboard-header glass-panel">
      <div className="header-left">
        <h2 style={{ margin: 0 }}>Kwik<span style={{ color: 'var(--accent)' }}>wiii</span></h2>
        <nav className="header-nav">
          <Link
            href="/dashboard"
            className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
          >
            Nouvelle Planification
          </Link>
          <Link
            href="/dashboard/calendar"
            className={`nav-link ${pathname === '/dashboard/calendar' ? 'active' : ''}`}
          >
            Calendrier
          </Link>
        </nav>
      </div>

      {/* ── Connection Status ── */}
      <div className="status-bar">
        {statusLoading ? (
          <span className="status-loading"><span className="spinner" style={{ width: 12, height: 12 }} /></span>
        ) : (
          PLATFORMS.map(({ key, name, connectUrl }) => {
            const s = status?.[key];
            return (
              <a
                key={key}
                href={s?.connected ? undefined : connectUrl}
                className={`status-chip ${s?.connected ? 'status-chip--ok' : 'status-chip--err'}`}
                title={s?.connected ? `Connecté : ${s.label}` : `Non connecté — cliquer pour authentifier`}
                onClick={s?.connected ? e => e.preventDefault() : undefined}
              >
                <span className="status-dot" />
                <span className="status-chip-icon">{name}</span>
                <span className="status-chip-label">
                  {s?.connected ? s.label : 'Non connecté'}
                </span>
              </a>
            );
          })
        )}
      </div>

      <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
        Déconnexion
      </button>
    </header>
  );
}
