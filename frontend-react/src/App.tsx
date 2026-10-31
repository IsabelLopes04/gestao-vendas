import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { AppLayout } from './components/AppLayout';
import { Toast } from './components/ui';

import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SalesPage } from './pages/SalesPage';
import { PromotersPage } from './pages/PromotersPage';

import { api } from './services/api';

import type {
  Meta,
  PageKey,
  RankingItem,
  Venda,
} from './types';

import { getCurrentMonth } from './utils/formatters';

export default function App() {
  const [page, setPage] = useState<PageKey>('dashboard');

  const [month, setMonth] = useState(getCurrentMonth);

  const [sales, setSales] = useState<Venda[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);
  const [newSaleSignal, setNewSaleSignal] = useState(0);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  }>({
    message: '',
    type: 'success',
  });

  // Fecha as notificações automaticamente.
  useEffect(() => {
    if (!toast.message) return;

    const timeout = window.setTimeout(
      () => setToast({
        message: '',
        type: 'success',
      }),
      4000
    );

    return () => window.clearTimeout(timeout);
  }, [toast.message]);

  // Exibe notificações.
  const notify = useCallback(
    (
      message: string,
      type: 'success' | 'error' = 'success'
    ) => {
      setToast({ message, type });
    },
    []
  );

  // Atualiza os dados do sistema.
  const refreshData = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  // Carrega vendas, metas e ranking.
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError('');

      try {
        const [
          salesResult,
          goalsResult,
          rankingResult,
        ] = await Promise.all([
          api.listarVendas(),
          api.listarMetas(month),
          api.rankingPromotores(month),
        ]);

        if (!active) return;

        setSales(salesResult);
        setMetas(goalsResult);
        setRanking(rankingResult);
      } catch (error) {
        if (!active) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [month, refreshKey]);

  // Abre a tela de vendas.
  function handleNewSale() {
    setPage('sales');
    setNewSaleSignal((current) => current + 1);
  }

  return (
    <AppLayout
      page={page}
      onNavigate={setPage}
      onNewSale={handleNewSale}
    >

      {loadError && (
        <div className="connection-alert" role="alert">

          <div>
            <IconAlert />
            <span>{loadError}</span>
          </div>

          <button
            type="button"
            onClick={refreshData}
          >
            Tentar novamente
          </button>

        </div>
      )}

      {page === 'dashboard' && (
        <DashboardPage
          sales={sales}
          metas={metas}
          ranking={ranking}
          month={month}
          onMonthChange={setMonth}
          loading={loading}
        />
      )}

      {page === 'sales' && (
        <SalesPage
          sales={sales}
          openSignal={newSaleSignal}
          onChanged={refreshData}
          onNotify={notify}
        />
      )}

      {page === 'goals' && (
        <GoalsPage
          metas={metas}
          sales={sales}
          month={month}
          onMonthChange={setMonth}
          onChanged={refreshData}
          onNotify={notify}
        />
      )}

      {page === 'reports' && (
        <ReportsPage
          sales={sales}
          onNotify={notify}
        />
      )}

      {page === 'promoters' && (
        <PromotersPage
          onChanged={refreshData}
          onNotify={notify}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast({
            message: '',
            type: 'success',
          })
        }
      />

    </AppLayout>
  );
}

function IconAlert() {
  return (
    <span
      className="connection-alert-icon"
      aria-hidden="true"
    >
      !
    </span>
  );
}