'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

type NavItem = { label: string; icon: string; href: Route };

export const navigation: NavItem[] = [
  { label: 'Overview', icon: '⌂', href: '/' },
  { label: 'Inventory', icon: '▦', href: '/inventory' },
  { label: 'Sales', icon: '↗', href: '/sales' },
  { label: 'Purchases', icon: '↓', href: '/purchases' },
  { label: 'Reports', icon: '◫', href: '/reports' },
  { label: 'Users', icon: '◎', href: '/users' },
  { label: 'Billing', icon: '◌', href: '/billing' },
  { label: 'Audit', icon: '✓', href: '/audit' },
  { label: 'Settings', icon: '⚙', href: '/settings' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/dashboard')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setProductCount(data.inventory.products);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const active = navigation.find((item) => item.href === pathname)?.label ?? 'Overview';

  function go(href: Route) {
    setMenuOpen(false);
    router.push(href);
  }

  return (
    <>
      <button className="sidebar-toggle no-print" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      {menuOpen && <div className="sidebar-scrim no-print" role="presentation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar no-print ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">S</span>
          <span className="brand-name">scoopstock</span>
          <span className="brand-badge">PRO</span>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">AR</span>
          <span><strong>August & Rye</strong><small>Retail workspace</small></span>
          <span className="chevron">⌄</span>
        </div>
        <p className="nav-caption">Workspace</p>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => (
            <button
              className={`nav-item ${active === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => go(item.href)}
            >
              <span className="nav-icon">{item.icon}</span>{item.label}
              {item.label === 'Inventory' && productCount !== null && <span className="nav-count">{productCount}</span>}
            </button>
          ))}
        </nav>
        <p className="nav-caption utility-caption">Manage</p>
        <nav className="nav-list">
          <button className="nav-item" onClick={() => go('/alerts')}><span className="nav-icon">?</span>Alerts</button>
          <button className="nav-item" onClick={() => go('/pos')}><span className="nav-icon">＋</span>New sale</button>
        </nav>
        <div className="sidebar-footer"><div className="user-avatar">AK</div><div><strong>Arjun Kapoor</strong><small>Owner</small></div><button aria-label="More account options" className="more-button">•••</button></div>
      </aside>
    </>
  );
}
