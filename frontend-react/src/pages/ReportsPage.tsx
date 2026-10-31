import { useMemo, useState } from 'react';

import { api } from '../services/api';
import type { ReportFilters, Venda } from '../types';

import { Icon } from '../components/ui';

export function ReportsPage({
  sales,
  onNotify,
}: {
  sales: Venda[];
  onNotify: (
    message: string,
    type?: 'success' | 'error'
  ) => void;
}) {
  const [filters, setFilters] = useState<ReportFilters>({
    mes: '',
  });

  const [generating, setGenerating] = useState(false);

  const promoters = useMemo(
    () =>
      Array.from(
        new Set(
          sales
            .map((sale) => sale.promotor)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [sales]
  );

  function updateFilter<K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K]
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleGenerate() {
    if (
      filters.valorMin &&
      filters.valorMax &&
      Number(filters.valorMin) > Number(filters.valorMax)
    ) {
      onNotify(
        'O valor mínimo não pode ser maior que o valor máximo.',
        'error'
      );
      return;
    }

    setGenerating(true);

    try {
      const blob = await api.gerarRelatorioPDF(filters);
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'relatorio-vendas.pdf';

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(
        () => URL.revokeObjectURL(objectUrl),
        1000
      );

      onNotify('Relatório PDF gerado com sucesso.');
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar o relatório.',
        'error'
      );
    } finally {
      setGenerating(false);
    }
  }

  function clearFilters() {
    setFilters({ mes: '' });
  }

  return (
    <div className="page-stack">
      <section className="report-intro panel">
        <div className="report-intro-icon">
          <Icon name="file" size={25} />
        </div>

        <div>
          <h2>Relatório de vendas em PDF</h2>
          <p>
            Gere um documento com o ranking de promotores e os
            registros de vendas de acordo com os filtros selecionados.
          </p>
        </div>
      </section>

      <section className="panel report-panel">
        <div className="panel-heading">
          <div>
            <h3>Configurar relatório</h3>
            <p>
              Os filtros são opcionais. Deixe em branco para não restringir.
            </p>
          </div>

          <span className="panel-icon">
            <Icon name="calendar" size={18} />
          </span>
        </div>

        <div className="form-grid two-columns report-fields">
          <label className="form-field">
            <span>Promotor</span>
            <select
              value={filters.promotor || ''}
              onChange={(event) =>
                updateFilter('promotor', event.target.value)
              }
            >
              <option value="">Todos os promotores</option>

              {promoters.map((promoter) => (
                <option key={promoter} value={promoter}>
                  {promoter}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Mês do ranking</span>
            <input
              type="month"
              value={filters.mes || ''}
              onChange={(event) =>
                updateFilter('mes', event.target.value)
              }
            />
          </label>

          <label className="form-field">
            <span>Buscar código ou paciente</span>
            <input
              value={filters.busca || ''}
              onChange={(event) =>
                updateFilter('busca', event.target.value)
              }
              placeholder="Digite um termo"
            />
          </label>

          <div className="form-grid two-columns compact-fields">
            <label className="form-field">
              <span>Valor mínimo (R$)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.valorMin || ''}
                onChange={(event) =>
                  updateFilter('valorMin', event.target.value)
                }
                placeholder="0,00"
              />
            </label>

            <label className="form-field">
              <span>Valor máximo (R$)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.valorMax || ''}
                onChange={(event) =>
                  updateFilter('valorMax', event.target.value)
                }
                placeholder="0,00"
              />
            </label>
          </div>
        </div>

        <div className="report-note">
          <Icon name="alert" size={17} />
          <p>
            O mês selecionado limita o ranking do PDF. Os filtros
            de promotor, busca e valor são aplicados à lista de vendas.
          </p>
        </div>

        <div className="report-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            <Icon name="download" size={17} />
            {generating ? 'Gerando PDF...' : 'Gerar relatório PDF'}
          </button>
        </div>
      </section>

      <section className="report-hint">
        <div className="report-hint-icon">
          <Icon name="check" size={18} />
        </div>

        <div>
          <strong>Pronto para exportar</strong>
          <p>
            O arquivo será baixado diretamente no seu computador.
            Confira os filtros antes de gerar o documento.
          </p>
        </div>
      </section>
    </div>
  );
}