'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

export default function DashboardHeader() {
  const pathname = usePathname();

  const handleLogout = useCallback(() => {
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  }, []);

  return (
    <header className="dashboard-header glass-panel">
      <div className="header-left">
        <h2 style={{ margin: 0 }}>Kwikwiii</h2>
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
      <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>Déconnexion</button>
    </header>
  );
}
