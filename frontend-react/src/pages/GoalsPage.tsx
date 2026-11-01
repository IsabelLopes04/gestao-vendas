import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import type { Meta, MetaInput, Promotor, Venda } from '../types';
import { formatCurrency, percent, toNumber, totalVenda } from '../utils/formatters';
import { EmptyState, Icon, Modal } from '../components/ui';

function initialGoal(month: string): MetaInput {
  return {
    mes_referencia: month,
    promotor: null,
    meta_vendas: 0,
    meta_faturamento: 0,
  };
}

export function GoalsPage({
  metas,
  sales,
  month,
  onMonthChange,
  onChanged,
  onNotify,
}: {
  metas: Meta[];
  sales: Venda[];
  month: string;
  onMonthChange: (month: string) => void;
  onChanged: () => Promise<void> | void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [form, setForm] = useState<MetaInput>(() => initialGoal(month));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [promotoresLoading, setPromotoresLoading] = useState(true);
  const [promotoresError, setPromotoresError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPromotores() {
      try {
        const result = await api.listarPromotores(true);
        if (!active) return;
        setPromotores(Array.isArray(result) ? result : []);
        setPromotoresError('');
      } catch (requestError) {
        if (!active) return;
        setPromotoresError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar os promotores cadastrados.',
        );
      } finally {
        if (active) setPromotoresLoading(false);
      }
    }

    void loadPromotores();

    return () => {
      active = false;
    };
  }, []);

  const monthSales = useMemo(
    () => sales.filter((sale) => sale.data_venda?.startsWith(month)),
    [sales, month],
  );

  function openCreate() {
    setEditing(null);
    setForm(initialGoal(month));
    setError('');
    setModalOpen(true);
  }

  function openEdit(goal: Meta) {
    setEditing(goal);
    setForm({
      mes_referencia: goal.mes_referencia,
      promotor: goal.promotor,
      meta_vendas: toNumber(goal.meta_vendas),
      meta_faturamento: toNumber(goal.meta_faturamento),
    });
    setError('');
    setModalOpen(true);
  }

  function updateField<K extends keyof MetaInput>(field: K, value: MetaInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const payload: MetaInput = {
      ...form,
      promotor: form.promotor?.trim() || null,
      meta_vendas: Number(form.meta_vendas),
      meta_faturamento: Number(form.meta_faturamento),
    };

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.mes_referencia)) {
      setError('Selecione um mês válido.');
      return;
    }

    if (!Number.isInteger(payload.meta_vendas) || payload.meta_vendas < 0 || !Number.isFinite(payload.meta_faturamento) || payload.meta_faturamento < 0) {
      setError('As metas devem ser números iguais ou maiores que zero. A quantidade de vendas deve ser inteira.');
      return;
    }

    setSaving(true);

    try {
      await api.salvarMeta(payload);
      setModalOpen(false);
      onNotify(editing ? 'Meta atualizada com sucesso.' : 'Meta salva ou atualizada com sucesso.');
      await onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar a meta.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goal: Meta) {
    const label = goal.promotor || 'meta geral da clínica';
    if (!window.confirm(`Deseja excluir a ${label} de ${goal.mes_referencia}?`)) return;

    try {
      await api.excluirMeta(goal.id);
      onNotify('Meta excluída com sucesso.');
      await onChanged();
    } catch (requestError) {
      onNotify(requestError instanceof Error ? requestError.message : 'Não foi possível excluir a meta.', 'error');
    }
  }

  const sortedGoals = [...metas].sort((a, b) => {
    if (a.promotor === null) return -1;
    if (b.promotor === null) return 1;
    return a.promotor.localeCompare(b.promotor, 'pt-BR');
  });

  function getGoalProgress(goal: Meta) {
    const relevantSales = goal.promotor
      ? monthSales.filter((sale) => sale.promotor === goal.promotor)
      : monthSales;
    const revenue = relevantSales.reduce((sum, sale) => sum + totalVenda(sale), 0);

    return {
      count: relevantSales.length,
      revenue,
      salesPercent: percent(relevantSales.length, toNumber(goal.meta_vendas)),
      revenuePercent: percent(revenue, toNumber(goal.meta_faturamento)),
    };
  }

  const promotorAtualDisponivel = promotores.some((promotor) => promotor.nome === form.promotor);
  const mostrarPromotorAntigo = Boolean(form.promotor) && !promotorAtualDisponivel;

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2 className="section-heading">Metas do período</h2>
          <p className="section-description">Acompanhe objetivos gerais e individuais.</p>
        </div>
        <div className="toolbar-actions">
          <label className="month-control">
            <Icon name="calendar" size={17} />
            <span className="sr-only">Selecionar mês das metas</span>
            <input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
          </label>
          <button type="button" className="button button-primary" onClick={openCreate}>
            <Icon name="plus" size={17} /> Nova meta
          </button>
        </div>
      </div>

      {sortedGoals.length ? (
        <section className="goal-cards-grid">
          {sortedGoals.map((goal) => {
            const progress = getGoalProgress(goal);

            return (
              <article className="panel goal-card" key={goal.id}>
                <div className="goal-card-header">
                  <div className="goal-avatar"><Icon name={goal.promotor ? 'users' : 'target'} size={19} /></div>
                  <div className="goal-card-title">
                    <strong>{goal.promotor || 'Meta geral da clínica'}</strong>
                    <span>{goal.promotor ? 'Meta individual' : 'Meta geral'}</span>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="icon-button" onClick={() => openEdit(goal)} aria-label="Editar meta" title="Editar"><Icon name="edit" size={16} /></button>
                    <button type="button" className="icon-button danger-hover" onClick={() => void handleDelete(goal)} aria-label="Excluir meta" title="Excluir"><Icon name="trash" size={16} /></button>
                  </div>
                </div>

                <div className="goal-targets">
                  <div><span>Meta de faturamento</span><strong>{formatCurrency(goal.meta_faturamento)}</strong></div>
                  <div><span>Meta de vendas</span><strong>{toNumber(goal.meta_vendas)}</strong></div>
                </div>

                <div className="goal-card-progress">
                  <div className="progress-label"><span>Faturamento realizado</span><strong>{progress.revenuePercent.toFixed(0)}%</strong></div>
                  <div className="progress-track"><span style={{ width: `${progress.revenuePercent}%` }} /></div>
                  <div className="progress-meta"><span>{formatCurrency(progress.revenue)}</span><span>Meta: {formatCurrency(goal.meta_faturamento)}</span></div>
                  <div className="progress-label second-progress"><span>Vendas realizadas</span><strong>{progress.salesPercent.toFixed(0)}%</strong></div>
                  <div className="progress-track"><span style={{ width: `${progress.salesPercent}%` }} /></div>
                  <div className="progress-meta"><span>{progress.count} vendas</span><span>Meta: {toNumber(goal.meta_vendas)}</span></div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="panel goals-empty-panel">
          <EmptyState title="Nenhuma meta para este mês" description="Cadastre uma meta geral para a clínica ou uma meta individual para cada promotor." />
          <button type="button" className="button button-primary" onClick={openCreate}><Icon name="plus" size={17} /> Cadastrar primeira meta</button>
        </section>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar meta' : 'Cadastrar meta'}
        description="Selecione um promotor para uma meta individual ou escolha a meta geral da clínica."
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid two-columns">
            <label className="form-field">
              <span>Mês de referência *</span>
              <input type="month" value={form.mes_referencia} onChange={(event) => updateField('mes_referencia', event.target.value)} required disabled={Boolean(editing)} />
            </label>

            <label className="form-field">
              <span>Promotor</span>
              <select
                value={form.promotor || ''}
                onChange={(event) => updateField('promotor', event.target.value || null)}
                disabled={promotoresLoading}
              >
                <option value="">Meta geral da clínica</option>
                {mostrarPromotorAntigo && (
                  <option value={form.promotor || ''}>{form.promotor} (inativo ou excluído)</option>
                )}
                {promotores.map((promotor) => (
                  <option key={promotor.id} value={promotor.nome}>{promotor.nome}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Quantidade de vendas *</span>
              <input type="number" min="0" step="1" value={form.meta_vendas} onChange={(event) => updateField('meta_vendas', Number(event.target.value))} required />
            </label>

            <label className="form-field">
              <span>Meta de faturamento (R$) *</span>
              <input type="number" min="0" step="0.01" value={form.meta_faturamento} onChange={(event) => updateField('meta_faturamento', Number(event.target.value))} required />
            </label>
          </div>

          {promotoresError && <div className="form-error" role="alert">{promotoresError}</div>}
          {!promotoresLoading && !promotoresError && promotores.length === 0 && (
            <p className="form-hint">Não há promotores ativos cadastrados. Você ainda pode criar uma meta geral da clínica.</p>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar meta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
