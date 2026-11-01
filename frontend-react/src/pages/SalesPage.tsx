import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import type { Promotor, Venda, VendaInput } from '../types';
import { formatCurrency, formatDate, toNumber, totalVenda } from '../utils/formatters';
import { EmptyState, Icon, Modal } from '../components/ui';

function emptyForm(): VendaInput {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    codigo: '',
    paciente: '',
    promotor: '',
    clinico: 0,
    raspagem: 0,
    inicio: 0,
    data_venda: today,
  };
}

export function SalesPage({
  sales,
  openSignal,
  onChanged,
  onNotify,
}: {
  sales: Venda[];
  openSignal: number;
  onChanged: () => Promise<void> | void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}) {
  const [search, setSearch] = useState('');
  const [promoterFilter, setPromoterFilter] = useState('');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Venda | null>(null);
  const [form, setForm] = useState<VendaInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  // Promotores disponíveis para novos cadastros (somente ativos).
  const [registeredPromoters, setRegisteredPromoters] = useState<Promotor[]>([]);
  const [promotersLoading, setPromotersLoading] = useState(true);
  const [promotersError, setPromotersError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRegisteredPromoters() {
      try {
        const result = await api.listarPromotores(true);
        if (!active) return;
        setRegisteredPromoters(Array.isArray(result) ? result : []);
        setPromotersError('');
      } catch (error) {
        if (!active) return;
        setPromotersError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os promotores cadastrados.',
        );
      } finally {
        if (active) setPromotersLoading(false);
      }
    }

    void loadRegisteredPromoters();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (openSignal > 0) openCreateModal();
    // openSignal representa o pedido de abertura enviado pelo cabeçalho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  // Esta lista é usada somente no filtro do histórico de vendas.
  const promoters = useMemo(
    () => Array.from(new Set(sales.map((sale) => sale.promotor).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [sales],
  );

  const filteredSales = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return [...sales]
      .filter((sale) => {
        const matchesSearch = !normalizedSearch ||
          `${sale.codigo} ${sale.paciente} ${sale.promotor}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch);
        const matchesPromoter = !promoterFilter || sale.promotor === promoterFilter;
        const total = totalVenda(sale);
        const matchesMinimum = minimum === '' || total >= toNumber(minimum);
        const matchesMaximum = maximum === '' || total <= toNumber(maximum);

        return matchesSearch && matchesPromoter && matchesMinimum && matchesMaximum;
      })
      .sort((a, b) => b.data_venda.localeCompare(a.data_venda) || b.id - a.id);
  }, [sales, search, promoterFilter, minimum, maximum]);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(sale: Venda) {
    setEditing(sale);
    setForm({
      codigo: sale.codigo,
      paciente: sale.paciente,
      promotor: sale.promotor,
      clinico: toNumber(sale.clinico),
      raspagem: toNumber(sale.raspagem),
      inicio: toNumber(sale.inicio),
      data_venda: sale.data_venda.slice(0, 10),
    });
    setFormError('');
    setModalOpen(true);
  }

  function updateField<K extends keyof VendaInput>(field: K, value: VendaInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const payload: VendaInput = {
      ...form,
      codigo: form.codigo.trim(),
      paciente: form.paciente.trim(),
      promotor: form.promotor.trim(),
      clinico: Number(form.clinico),
      raspagem: Number(form.raspagem),
      inicio: Number(form.inicio),
    };

    if (!payload.codigo || !payload.paciente || !payload.promotor || !payload.data_venda) {
      setFormError('Preencha código, paciente, promotor e data da venda.');
      return;
    }

    if ([payload.clinico, payload.raspagem, payload.inicio].some((value) => !Number.isFinite(value) || value < 0)) {
      setFormError('Os valores dos procedimentos devem ser números iguais ou maiores que zero.');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await api.editarVenda(editing.id, payload);
        onNotify('Venda atualizada com sucesso.');
      } else {
        await api.criarVenda(payload);
        onNotify('Venda cadastrada com sucesso.');
      }

      setModalOpen(false);
      await onChanged();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a venda.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sale: Venda) {
    const confirmed = window.confirm(`Deseja realmente excluir a venda ${sale.codigo}?`);
    if (!confirmed) return;

    setDeletingId(sale.id);

    try {
      await api.excluirVenda(sale.id);
      onNotify('Venda excluída com sucesso.');
      await onChanged();
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Não foi possível excluir a venda.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const visibleRevenue = filteredSales.reduce((sum, sale) => sum + totalVenda(sale), 0);
  const promoterIsAvailable = registeredPromoters.some((promoter) => promoter.nome === form.promotor);
  const showLegacyPromoterOption = Boolean(form.promotor) && !promoterIsAvailable;

  return (
    <div className="page-stack">
      <section className="list-summary panel">
        <div>
          <span className="stat-label">Vendas encontradas</span>
          <strong>{filteredSales.length}</strong>
          <span className="stat-note">de {sales.length} registros</span>
        </div>
        <div className="summary-divider" />
        <div>
          <span className="stat-label">Faturamento filtrado</span>
          <strong>{formatCurrency(visibleRevenue)}</strong>
          <span className="stat-note">Soma dos procedimentos exibidos</span>
        </div>
        <button type="button" className="button button-primary" onClick={openCreateModal}>
          <Icon name="plus" size={17} /> Nova venda
        </button>
      </section>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3>Todas as vendas</h3>
            <p>Use os filtros para encontrar um registro específico.</p>
          </div>
          <button
            type="button"
            className="button button-quiet"
            onClick={() => { setSearch(''); setPromoterFilter(''); setMinimum(''); setMaximum(''); }}
          >
            <Icon name="refresh" size={16} /> Limpar filtros
          </button>
        </div>

        <div className="filters-grid sales-filters">
          <label className="search-field">
            <Icon name="search" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar código, paciente ou promotor" />
          </label>
          <select value={promoterFilter} onChange={(event) => setPromoterFilter(event.target.value)} aria-label="Filtrar por promotor">
            <option value="">Todos os promotores</option>
            {promoters.map((promoter) => <option key={promoter} value={promoter}>{promoter}</option>)}
          </select>
          <input type="number" min="0" step="0.01" value={minimum} onChange={(event) => setMinimum(event.target.value)} placeholder="Valor mínimo" aria-label="Valor mínimo" />
          <input type="number" min="0" step="0.01" value={maximum} onChange={(event) => setMaximum(event.target.value)} placeholder="Valor máximo" aria-label="Valor máximo" />
        </div>

        {filteredSales.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Código</th>
                  <th>Paciente</th>
                  <th>Promotor</th>
                  <th className="align-right">Valor total</th>
                  <th className="align-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="muted-cell">{formatDate(sale.data_venda)}</td>
                    <td><span className="code-pill">{sale.codigo}</span></td>
                    <td className="primary-cell">{sale.paciente}</td>
                    <td>{sale.promotor}</td>
                    <td className="align-right amount-cell">{formatCurrency(totalVenda(sale))}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-button" onClick={() => openEditModal(sale)} aria-label={`Editar venda ${sale.codigo}`} title="Editar">
                          <Icon name="edit" size={16} />
                        </button>
                        <button type="button" className="icon-button danger-hover" onClick={() => void handleDelete(sale)} disabled={deletingId === sale.id} aria-label={`Excluir venda ${sale.codigo}`} title="Excluir">
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={sales.length ? 'Nenhum resultado encontrado' : 'Nenhuma venda cadastrada'}
            description={sales.length ? 'Tente alterar ou limpar os filtros.' : 'Cadastre a primeira venda para começar a acompanhar os resultados.'}
          />
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar venda' : 'Cadastrar venda'}
        description="Preencha os dados da venda. Os campos marcados são obrigatórios."
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid two-columns">
            <label className="form-field">
              <span>Código *</span>
              <input value={form.codigo} onChange={(event) => updateField('codigo', event.target.value)} maxLength={50} required autoFocus />
            </label>
            <label className="form-field">
              <span>Data da venda *</span>
              <input type="date" value={form.data_venda} onChange={(event) => updateField('data_venda', event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Paciente *</span>
              <input value={form.paciente} onChange={(event) => updateField('paciente', event.target.value)} maxLength={150} required />
            </label>
            <label className="form-field">
              <span>Promotor *</span>
              <select
                value={form.promotor}
                onChange={(event) => updateField('promotor', event.target.value)}
                required
                disabled={promotersLoading}
              >
                <option value="">
                  {promotersLoading ? 'Carregando promotores...' : 'Selecione um promotor'}
                </option>
                {showLegacyPromoterOption && (
                  <option value={form.promotor}>{form.promotor} (inativo ou excluído)</option>
                )}
                {registeredPromoters.map((promoter) => (
                  <option key={promoter.id} value={promoter.nome}>{promoter.nome}</option>
                ))}
              </select>
            </label>
          </div>

          {promotersError && <div className="form-error" role="alert">{promotersError}</div>}
          {!promotersLoading && !promotersError && registeredPromoters.length === 0 && !form.promotor && (
            <div className="form-error" role="status">Nenhum promotor ativo cadastrado. Cadastre ou reative um promotor antes de registrar uma nova venda.</div>
          )}

          <div className="form-section-title">Valores dos procedimentos</div>
          <div className="form-grid three-columns">
            <label className="form-field">
              <span>Clínico (R$)</span>
              <input type="number" min="0" step="0.01" value={form.clinico} onChange={(event) => updateField('clinico', Number(event.target.value))} />
            </label>
            <label className="form-field">
              <span>Raspagem (R$)</span>
              <input type="number" min="0" step="0.01" value={form.raspagem} onChange={(event) => updateField('raspagem', Number(event.target.value))} />
            </label>
            <label className="form-field">
              <span>Início (R$)</span>
              <input type="number" min="0" step="0.01" value={form.inicio} onChange={(event) => updateField('inicio', Number(event.target.value))} />
            </label>
          </div>

          <div className="form-total"><span>Total da venda</span><strong>{formatCurrency(toNumber(form.clinico) + toNumber(form.raspagem) + toNumber(form.inicio))}</strong></div>
          {formError && <div className="form-error" role="alert">{formError}</div>}
          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={saving || promotersLoading || (!form.promotor && registeredPromoters.length === 0)}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar venda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
