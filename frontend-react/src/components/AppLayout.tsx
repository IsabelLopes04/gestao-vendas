import type { ReactNode } from 'react';
import type { PageKey } from '../types';
import { Icon } from './ui';

const navigation: {
  key: PageKey;
  label: string;
  icon: 'grid' | 'receipt' | 'target' | 'file';
}[] = [
  { key: 'dashboard', label: 'Visão geral', icon: 'grid' },
  { key: 'sales', label: 'Vendas', icon: 'receipt' },
  { key: 'goals', label: 'Metas', icon: 'target' },
  { key: 'reports', label: 'Relatórios', icon: 'file' },
  { key: 'promoters', label: 'Promotores', icon: 'target' },
];

const pageInfo: Record<
  PageKey,
  { title: string; subtitle: string }
> = {
  dashboard: {
    title: 'Visão geral',
    subtitle: 'Acompanhe os resultados e o desempenho da operação.',
  },

  sales: {
    title: 'Vendas',
    subtitle: 'Consulte, cadastre e mantenha as vendas organizadas.',
  },

  goals: {
    title: 'Metas',
    subtitle: 'Defina objetivos mensais gerais e por promotor.',
  },

  reports: {
    title: 'Relatórios',
    subtitle: 'Exporte informações para acompanhamento e análise.',
  },

  promoters: {
    title: 'Promotores',
    subtitle: 'Gerencie os promotores cadastrados no sistema.',
  },
};

export function AppLayout({
  page,
  onNavigate,
  onNewSale,
  children,
}: {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  onNewSale: () => void;
  children: ReactNode;
}) {
  const info = pageInfo[page];

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">GV</div>

          <div className="brand-copy">
            <strong>gestão</strong>
            <span>PAINEL DE VENDAS</span>
          </div>
        </div>

        <div className="sidebar-label">
          MENU PRINCIPAL
        </div>

        <nav
          className="main-nav"
          aria-label="Navegação principal"
        >
          {navigation.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${
                page === item.key ? 'active' : ''
              }`}
              onClick={() => onNavigate(item.key)}
              aria-current={
                page === item.key ? 'page' : undefined
              }
            >
              <Icon name={item.icon} size={19} />

              <span>{item.label}</span>

              {page === item.key && (
                <span className="nav-active-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-icon">
            <Icon name="wallet" size={18} />
          </div>

          <div>
            <strong>Gestão organizada</strong>
            <span>Seus dados em um só lugar</span>
          </div>
        </div>

      </aside>

      <main className="main-area">

        <header className="topbar">

          <div className="topbar-title">
            <span className="eyebrow">
              PAINEL DE CONTROLE
            </span>

            <h1>{info.title}</h1>

            <p>{info.subtitle}</p>
          </div>

          <div className="topbar-actions">

            <span className="api-status">
              <span className="status-dot" />
              API local
            </span>

            <button
              type="button"
              className="button button-primary"
              onClick={onNewSale}
            >
              <Icon name="plus" size={17} />
              <span>Nova venda</span>
            </button>

          </div>

        </header>

        <div className="page-content">
          {children}
        </div>

        <footer className="app-footer">
          Gestão de Vendas <span>•</span> Ambiente interno
        </footer>

      </main>

    </div>
  );
}