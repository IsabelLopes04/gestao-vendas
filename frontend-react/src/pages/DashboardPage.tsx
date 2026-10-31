import type { Meta, RankingItem, Venda } from '../types';
import {
  formatCurrency,
  formatDate,
  formatMonth,
  getCurrentMonth,
  percent,
  toNumber,
  totalVenda,
} from '../utils/formatters';
import { EmptyState, Icon, StatCard } from '../components/ui';

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;
}

function SalesTrendChart({ sales }: { sales: Venda[] }) {
  const now = new Date();

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (5 - index),
      1
    );

    const key = monthKey(date);

    const total = sales
      .filter((sale) => sale.data_venda?.startsWith(key))
      .reduce((sum, sale) => sum + totalVenda(sale), 0);

    return {
      key,
      label: new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
      }).format(date).replace('.', ''),
      total,
    };
  });

  const width = 640;
  const height = 220;
  const left = 12;
  const right = 12;
  const top = 18;
  const bottom = 34;

  const max = Math.max(
    ...months.map((item) => item.total),
    1
  );

  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;

  const points = months.map((item, index) => {
    const x = left + (chartWidth / (months.length - 1)) * index;
    const y = top + chartHeight - (item.total / max) * chartHeight;

    return { x, y, ...item };
  });

  const polyline = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const areaPath = `
    M ${points[0].x} ${height - bottom}
    L ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}
    L ${points[points.length - 1].x} ${height - bottom}
    Z
  `;

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span className="legend-dot" />
        Faturamento
      </div>

      <svg
        className="sales-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico de faturamento dos últimos seis meses"
      >
        <defs>
          <linearGradient
            id="sales-area"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#708397"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="#708397"
              stopOpacity="0.01"
            />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((line) => {
          const y = top + (chartHeight / 3) * line;

          return (
            <line
              key={line}
              x1={left}
              x2={width - right}
              y1={y}
              y2={y}
              className="chart-grid-line"
            />
          );
        })}

        <path d={areaPath} fill="url(#sales-area)" />
        <polyline points={polyline} className="chart-line" />

        {points.map((point) => (
          <g key={point.key}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4.5"
              className="chart-point"
            />
            <text
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className="chart-label"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="chart-footnote">
        Valores calculados a partir das vendas cadastradas.
      </div>
    </div>
  );
}

export function DashboardPage({
  sales,
  metas,
  ranking,
  month,
  onMonthChange,
  loading,
}: {
  sales: Venda[];
  metas: Meta[];
  ranking: RankingItem[];
  month: string;
  onMonthChange: (month: string) => void;
  loading: boolean;
}) {
  const monthSales = sales.filter((sale) =>
    sale.data_venda?.startsWith(month)
  );

  const revenue = monthSales.reduce(
    (sum, sale) => sum + totalVenda(sale),
    0
  );

  const averageTicket = monthSales.length
    ? revenue / monthSales.length
    : 0;

  const generalGoal = metas.find(
    (goal) => goal.promotor === null
  );

  const individualGoals = metas.filter(
    (goal) => goal.promotor !== null
  );

  const goalSales = generalGoal
    ? toNumber(generalGoal.meta_vendas)
    : individualGoals.reduce(
        (sum, goal) => sum + toNumber(goal.meta_vendas),
        0
      );

  const goalRevenue = generalGoal
    ? toNumber(generalGoal.meta_faturamento)
    : individualGoals.reduce(
        (sum, goal) => sum + toNumber(goal.meta_faturamento),
        0
      );

  const revenueProgress = percent(revenue, goalRevenue);
  const salesProgress = percent(monthSales.length, goalSales);

  const recentSales = [...monthSales]
    .sort(
      (a, b) =>
        b.data_venda.localeCompare(a.data_venda) ||
        b.id - a.id
    )
    .slice(0, 5);

  const topRanking = [...ranking]
    .sort(
      (a, b) =>
        toNumber(b.faturamento_total) -
        toNumber(a.faturamento_total)
    )
    .slice(0, 5);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2 className="section-heading">
            Resumo do desempenho
          </h2>
          <p className="section-description">
            Indicadores e movimentações de {formatMonth(month)}.
          </p>
        </div>

        <label className="month-control">
          <Icon name="calendar" size={17} />
          <span className="sr-only">Selecionar mês</span>
          <input
            type="month"
            value={month}
            max={getCurrentMonth()}
            onChange={(event) => onMonthChange(event.target.value)}
          />
        </label>
      </div>

      {loading && (
        <div className="inline-loading">
          Atualizando informações...
        </div>
      )}

      <section className="stats-grid" aria-label="Indicadores do mês">
        <StatCard
          label="Vendas no mês"
          value={String(monthSales.length)}
          note="Vendas registradas no período"
          icon="receipt"
        />

        <StatCard
          label="Faturamento"
          value={formatCurrency(revenue)}
          note="Soma dos procedimentos vendidos"
          icon="wallet"
        />

        <StatCard
          label="Ticket médio"
          value={formatCurrency(averageTicket)}
          note="Faturamento dividido pelas vendas"
          icon="trend"
        />

        <StatCard
          label="Meta de faturamento"
          value={
            goalRevenue > 0
              ? formatCurrency(goalRevenue)
              : 'Não definida'
          }
          note={
            goalRevenue > 0
              ? `${revenueProgress.toFixed(0)}% alcançado`
              : 'Cadastre uma meta para acompanhar'
          }
          icon="target"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Faturamento ao longo do tempo</h3>
              <p>Últimos seis meses</p>
            </div>

            <span className="panel-icon">
              <Icon name="trend" size={18} />
            </span>
          </div>

          {sales.length ? (
            <SalesTrendChart sales={sales} />
          ) : (
            <EmptyState
              title="Sem dados para o gráfico"
              description="Cadastre vendas para visualizar a evolução do faturamento."
            />
          )}
        </article>

        <article className="panel goal-panel">
          <div className="panel-heading">
            <div>
              <h3>Progresso das metas</h3>
              <p>Resultado de {formatMonth(month)}</p>
            </div>

            <span className="panel-icon">
              <Icon name="target" size={18} />
            </span>
          </div>

          {goalRevenue > 0 || goalSales > 0 ? (
            <div className="goal-progress-list">
              <div className="progress-item">
                <div className="progress-label">
                  <span>Faturamento</span>
                  <strong>{revenueProgress.toFixed(0)}%</strong>
                </div>

                <div className="progress-track">
                  <span style={{ width: `${revenueProgress}%` }} />
                </div>

                <div className="progress-meta">
                  <span>{formatCurrency(revenue)}</span>
                  <span>Meta: {formatCurrency(goalRevenue)}</span>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-label">
                  <span>Quantidade de vendas</span>
                  <strong>{salesProgress.toFixed(0)}%</strong>
                </div>

                <div className="progress-track">
                  <span style={{ width: `${salesProgress}%` }} />
                </div>

                <div className="progress-meta">
                  <span>{monthSales.length} vendas</span>
                  <span>Meta: {goalSales}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Nenhuma meta cadastrada"
              description="Cadastre uma meta geral ou individual para acompanhar o progresso."
            />
          )}

          <div className="goal-panel-footer">
            {generalGoal
              ? 'Considerando a meta geral da clínica.'
              : 'Considerando a soma das metas individuais.'}
          </div>
        </article>
      </section>

      <section className="dashboard-grid lower-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Ranking de promotores</h3>
              <p>Classificação por faturamento no mês</p>
            </div>

            <span className="panel-icon">
              <Icon name="users" size={18} />
            </span>
          </div>

          {topRanking.length ? (
            <div className="ranking-list">
              {topRanking.map((item, index) => (
                <div className="ranking-row" key={item.promotor}>
                  <span
                    className={`ranking-position ${
                      index === 0 ? 'first' : ''
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="ranking-person">
                    <strong>{item.promotor}</strong>
                    <span>
                      {toNumber(item.total_vendas)} vendas
                    </span>
                  </div>

                  <strong className="ranking-value">
                    {formatCurrency(item.faturamento_total)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Ranking indisponível"
              description="Ainda não há vendas para este período."
            />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Vendas recentes</h3>
              <p>Últimos registros do período selecionado</p>
            </div>

            <span className="panel-icon">
              <Icon name="receipt" size={18} />
            </span>
          </div>

          {recentSales.length ? (
            <div className="recent-list">
              {recentSales.map((sale) => (
                <div className="recent-row" key={sale.id}>
                  <div className="recent-avatar">
                    {sale.codigo.trim().charAt(0).toUpperCase() || 'V'}
                  </div>

                  <div className="recent-info">
                    <strong>Venda {sale.codigo}</strong>
                    <span>
                      {sale.promotor} · {formatDate(sale.data_venda)}
                    </span>
                  </div>

                  <strong className="recent-value">
                    {formatCurrency(totalVenda(sale))}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma venda neste mês"
              description="Quando novas vendas forem cadastradas, elas aparecerão aqui."
            />
          )}
        </article>
      </section>
    </div>
  );
}