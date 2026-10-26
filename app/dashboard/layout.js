'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, Users, FileText, Star, Image, BarChart3,
  Zap, LogOut, ChevronLeft, ChevronRight, Settings, Bell,
  Menu, X, Sparkles, QrCode, Tag, FileSpreadsheet, BookOpen, ShoppingBag, Compass
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/seo', label: 'Auditoria SEO', icon: Sparkles },
  { href: '/dashboard/rank-tracker', label: 'Rank Tracker (Grid)', icon: Compass },
  { href: '/dashboard/review-cards', label: 'Cards & QR Code', icon: QrCode },
  { href: '/dashboard/categories', label: 'Categorias GBP', icon: Tag },
  { href: '/dashboard/reports', label: 'Relatórios', icon: FileSpreadsheet },
  { href: '/dashboard/posts', label: 'Posts', icon: FileText },
  { href: '/dashboard/products', label: 'Produtos', icon: ShoppingBag },
  { href: '/dashboard/reviews', label: 'Avaliações', icon: Star },
  { href: '/dashboard/photos', label: 'Fotos', icon: Image },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
  { href: '/dashboard/docs', label: 'Documentação', icon: BookOpen },
];

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
      } else {
        setUser(user);
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <div style={styles.layout}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        width: `${sidebarWidth}px`,
        ...(mobileOpen ? styles.sidebarMobileOpen : {}),
      }}>
        {/* Logo */}
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <Zap size={20} />
            </div>
            {!collapsed && <span style={styles.logoText}>GBP Manager</span>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={styles.collapseBtn}
            className="hide-mobile"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} style={{
                  color: isActive ? '#3B82F6' : '#6B7280',
                  flexShrink: 0,
                }} />
                {!collapsed && (
                  <span style={{
                    ...styles.navLabel,
                    color: isActive ? '#F9FAFB' : '#9CA3AF',
                  }}>
                    {item.label}
                  </span>
                )}
                {isActive && <div style={styles.navIndicator} />}
              </a>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={styles.sidebarFooter}>
          <button onClick={handleLogout} style={styles.navItem} title="Sair">
            <LogOut size={20} style={{ color: '#6B7280', flexShrink: 0 }} />
            {!collapsed && <span style={styles.navLabel}>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ ...styles.main, marginLeft: `${sidebarWidth}px` }}>
        {/* Header */}
        <header style={styles.header}>
          <button
            onClick={() => setMobileOpen(true)}
            style={styles.mobileMenuBtn}
          >
            <Menu size={24} />
          </button>

          <div style={styles.headerRight}>
            <button className="btn btn-icon btn-ghost" title="Notificações">
              <Bell size={20} />
            </button>
            {user && (
              <div style={styles.userBadge}>
                <div style={styles.userAvatar}>
                  {(user.user_metadata?.full_name || user.email)?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hide-mobile" style={styles.userName}>
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: '100vh',
    background: '#06080F',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, #0C1120 0%, #06080F 100%)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 50,
    overflow: 'hidden',
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)',
    width: '260px',
  },
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 40,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
  },
  logoText: {
    fontSize: '1.125rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  collapseBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '10px',
    transition: 'all 0.15s ease',
    position: 'relative',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    textDecoration: 'none',
  },
  navItemActive: {
    background: 'rgba(59, 130, 246, 0.1)',
  },
  navLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  navIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '20px',
    borderRadius: '0 3px 3px 0',
    background: 'linear-gradient(180deg, #3B82F6, #8B5CF6)',
  },
  sidebarFooter: {
    padding: '12px 8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  main: {
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minHeight: '100vh',
  },
  header: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(6, 8, 15, 0.8)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 30,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
  },
  mobileMenuBtn: {
    display: 'none',
    color: '#9CA3AF',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px 6px 6px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: 'white',
  },
  userName: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#D1D5DB',
  },
  content: {
    padding: '24px',
    maxWidth: '1400px',
    animation: 'fadeIn 0.25s ease-out',
  },
};
