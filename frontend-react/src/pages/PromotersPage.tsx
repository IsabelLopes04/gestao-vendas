import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';

interface Promotor {
  id: number;
  nome: string;
  ativo: boolean | number | string;
  criado_em?: string | null;
}

interface PromotersPageProps {
  onChanged: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

type StatusFilter = 'todos' | 'ativos' | 'inativos';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const estilos: Record<string, CSSProperties> = {
  pagina: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  cabecalho: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  titulo: {
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
    color: '#25312c',
  },
  descricao: {
    fontSize: '14px',
    color: '#78827d',
    marginTop: '6px',
  },
  botoes: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  botao: {
    border: 'none',
    borderRadius: '8px',
    padding: '11px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  primario: {
    background: '#315f4b',
    color: '#ffffff',
  },
  secundario: {
    background: '#edf1ee',
    color: '#315f4b',
  },
  desabilitado: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e8ece9',
    borderRadius: '12px',
    padding: '20px',
  },
  cardLabel: {
    fontSize: '12px',
    color: '#78827d',
    margin: 0,
  },
  cardValor: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#25312c',
    margin: '10px 0 4px',
  },
  painel: {
    background: '#ffffff',
    border: '1px solid #e8ece9',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  painelCabecalho: {
    padding: '20px',
    borderBottom: '1px solid #edf0ed',
  },
  filtros: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1fr) minmax(150px, 200px)',
    gap: '12px',
    padding: '16px 20px',
  },
  campo: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    border: '1px solid #dce3de',
    borderRadius: '8px',
    fontSize: '13px',
    background: '#ffffff',
    color: '#25312c',
  },
  tabelaContainer: {
    width: '100%',
    overflowX: 'auto',
  },
  tabela: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  celula: {
    padding: '14px 20px',
    borderBottom: '1px solid #edf0ed',
    fontSize: '13px',
    color: '#53615a',
  },
  celulaTitulo: {
    padding: '14px 20px',
    borderBottom: '1px solid #edf0ed',
    fontSize: '11px',
    color: '#78827d',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  acoes: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  botaoAcao: {
    border: '1px solid #e0e6e1',
    background: '#ffffff',
    color: '#315f4b',
    borderRadius: '7px',
    padding: '7px 10px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  alerta: {
    padding: '14px 16px',
    background: '#fff1f0',
    color: '#a33b35',
    borderRadius: '8px',
    fontSize: '13px',
  },
  vazio: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#78827d',
    fontSize: '14px',
  },
  modalFundo: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20, 30, 25, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modal: {
    background: '#ffffff',
    borderRadius: '14px',
    padding: '24px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
  },
  campoGrupo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '20px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#435149',
  },
  modalAcoes: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
  },
};

function isPromotorAtivo(ativo: Promotor['ativo']): boolean {
  return (
    ativo === true ||
    ativo === 1 ||
    ativo === '1' ||
    ativo === 'true'
  );
}

function obterMensagemErro(erro: unknown): string {
  return erro instanceof Error
    ? erro.message
    : 'Ocorreu um erro inesperado.';
}

async function apiRequest<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<T> {
  const headers = new Headers(opcoes.headers);

  if (opcoes.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let resposta: Response;

  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      ...opcoes,
      headers,
    });
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
    );
  }

  const texto = await resposta.text();

  let dados: unknown = null;

  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status} ao realizar a operação.`;

    if (dados && typeof dados === 'object') {
      const objeto = dados as Record<string, unknown>;

      if (typeof objeto.erro === 'string') {
        mensagem = objeto.erro;
      } else if (typeof objeto.mensagem === 'string') {
        mensagem = objeto.mensagem;
      }
    }

    throw new Error(mensagem);
  }

  return dados as T;
}

function formatarData(data?: string | null): string {
  if (!data) return '—';

  const dataNormalizada = data.substring(0, 10);
  const partes = dataNormalizada.split('-');

  if (partes.length !== 3) return data;

  const [ano, mes, dia] = partes;

  return `${dia}/${mes}/${ano}`;
}

export function PromotersPage({
  onChanged,
  onNotify,
}: PromotersPageProps) {
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] =
    useState<StatusFilter>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [promotorEditando, setPromotorEditando] =
    useState<Promotor | null>(null);

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Carregamento inicial dos promotores.
  useEffect(() => {
    let componenteAtivo = true;

    async function carregarInicialmente() {
      try {
        const dados = await apiRequest<Promotor[]>('/api/promotores');

        if (componenteAtivo) {
          setPromotores(Array.isArray(dados) ? dados : []);
          setError('');
        }
      } catch (erro: unknown) {
        if (componenteAtivo) {
          setError(obterMensagemErro(erro));
        }
      } finally {
        if (componenteAtivo) {
          setLoading(false);
        }
      }
    }

    void carregarInicialmente();

    return () => {
      componenteAtivo = false;
    };
  }, []);

  // Atualiza a lista quando necessário.
  async function carregarPromotores(): Promise<void> {
    setLoading(true);
    setError('');

    try {
      const dados = await apiRequest<Promotor[]>('/api/promotores');

      setPromotores(Array.isArray(dados) ? dados : []);
    } catch (erro: unknown) {
      setError(obterMensagemErro(erro));
    } finally {
      setLoading(false);
    }
  }

  function abrirCadastro() {
    setPromotorEditando(null);
    setNome('');
    setFormError('');
    setModalOpen(true);
  }

  function abrirEdicao(promotor: Promotor) {
    setPromotorEditando(promotor);
    setNome(promotor.nome);
    setFormError('');
    setModalOpen(true);
  }

  function fecharModal() {
    if (saving) return;

    setModalOpen(false);
    setPromotorEditando(null);
    setNome('');
    setFormError('');
  }

  // Cadastrar ou editar promotor.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      setFormError('Informe o nome do promotor.');
      return;
    }

    if (nomeLimpo.length > 100) {
      setFormError('O nome deve ter no máximo 100 caracteres.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (promotorEditando) {
        await apiRequest(
          `/api/promotores/${promotorEditando.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({ nome: nomeLimpo }),
          },
        );
      } else {
        await apiRequest('/api/promotores', {
          method: 'POST',
          body: JSON.stringify({ nome: nomeLimpo }),
        });
      }

      setModalOpen(false);
      setPromotorEditando(null);
      setNome('');

      await carregarPromotores();

      onChanged();

      onNotify(
        promotorEditando
          ? 'Promotor atualizado com sucesso.'
          : 'Promotor cadastrado com sucesso.',
        'success',
      );
    } catch (erro: unknown) {
      const mensagem = obterMensagemErro(erro);

      setFormError(mensagem);
      onNotify(mensagem, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Ativar ou desativar promotor.
  async function handleToggleStatus(promotor: Promotor) {
    const ativoAtual = isPromotorAtivo(promotor.ativo);
    const novoStatus = !ativoAtual;

    const acao = novoStatus ? 'reativar' : 'desativar';

    const confirmou = window.confirm(
      `Deseja ${acao} o promotor "${promotor.nome}"?`,
    );

    if (!confirmou) return;

    setUpdatingId(promotor.id);

    try {
      await apiRequest(
        `/api/promotores/${promotor.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ ativo: novoStatus }),
        },
      );

      await carregarPromotores();

      onChanged();

      onNotify(
        novoStatus
          ? 'Promotor reativado com sucesso.'
          : 'Promotor desativado com sucesso.',
        'success',
      );
    } catch (erro: unknown) {
      onNotify(obterMensagemErro(erro), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  // Busca e filtros.
  const promotoresFiltrados = useMemo(() => {
    return promotores.filter((promotor) => {
      const nomeCorresponde = promotor.nome
        .toLocaleLowerCase('pt-BR')
        .includes(busca.trim().toLocaleLowerCase('pt-BR'));

      const ativo = isPromotorAtivo(promotor.ativo);

      const statusCorresponde =
        filtroStatus === 'todos' ||
        (filtroStatus === 'ativos' && ativo) ||
        (filtroStatus === 'inativos' && !ativo);

      return nomeCorresponde && statusCorresponde;
    });
  }, [promotores, busca, filtroStatus]);

  const totalAtivos = promotores.filter((promotor) =>
    isPromotorAtivo(promotor.ativo),
  ).length;

  const totalInativos = promotores.length - totalAtivos;

  return (
    <main style={estilos.pagina}>
      {/* Cabeçalho */}
      <header style={estilos.cabecalho}>
        <div>
          <h2 style={estilos.titulo}>Cadastro de promotores</h2>

          <p style={estilos.descricao}>
            Cadastre, edite e controle os promotores do sistema.
          </p>
        </div>

        <div style={estilos.botoes}>
          <button
            type="button"
            style={{
              ...estilos.botao,
              ...estilos.secundario,
              ...(loading ? estilos.desabilitado : {}),
            }}
            onClick={() => void carregarPromotores()}
            disabled={loading}
          >
            Atualizar
          </button>

          <button
            type="button"
            style={{
              ...estilos.botao,
              ...estilos.primario,
            }}
            onClick={abrirCadastro}
          >
            + Novo promotor
          </button>
        </div>
      </header>

      {/* Indicadores */}
      <section style={estilos.cards}>
        <div style={estilos.card}>
          <p style={estilos.cardLabel}>Total de promotores</p>
          <p style={estilos.cardValor}>{promotores.length}</p>
          <p style={estilos.cardLabel}>Promotores cadastrados</p>
        </div>

        <div style={estilos.card}>
          <p style={estilos.cardLabel}>Promotores ativos</p>
          <p style={estilos.cardValor}>{totalAtivos}</p>
          <p style={estilos.cardLabel}>Disponíveis para novas vendas</p>
        </div>

        <div style={estilos.card}>
          <p style={estilos.cardLabel}>Promotores inativos</p>
          <p style={estilos.cardValor}>{totalInativos}</p>
          <p style={estilos.cardLabel}>Cadastros desativados</p>
        </div>
      </section>

      {/* Mensagem de erro */}
      {error && (
        <div style={estilos.alerta} role="alert">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => void carregarPromotores()}
            style={{
              ...estilos.botao,
              ...estilos.secundario,
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Tabela de promotores */}
      <section style={estilos.painel}>
        <div style={estilos.painelCabecalho}>
          <h3 style={{ margin: 0, color: '#25312c' }}>
            Promotores cadastrados
          </h3>

          <p style={estilos.descricao}>
            {promotoresFiltrados.length} resultado(s) encontrado(s).
          </p>
        </div>

        {/* Filtros */}
        <div style={estilos.filtros}>
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            style={estilos.campo}
          />

          <select
            value={filtroStatus}
            onChange={(event) =>
              setFiltroStatus(event.target.value as StatusFilter)
            }
            style={estilos.campo}
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente inativos</option>
          </select>
        </div>

        {loading ? (
          <div style={estilos.vazio}>
            Carregando promotores...
          </div>
        ) : promotoresFiltrados.length === 0 ? (
          <div style={estilos.vazio}>
            {promotores.length === 0
              ? 'Nenhum promotor cadastrado.'
              : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <div style={estilos.tabelaContainer}>
            <table style={estilos.tabela}>
              <thead>
                <tr>
                  <th style={estilos.celulaTitulo}>Nome</th>
                  <th style={estilos.celulaTitulo}>Data de cadastro</th>
                  <th style={estilos.celulaTitulo}>Status</th>
                  <th
                    style={{
                      ...estilos.celulaTitulo,
                      textAlign: 'right',
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {promotoresFiltrados.map((promotor) => {
                  const ativo = isPromotorAtivo(promotor.ativo);
                  const atualizando = updatingId === promotor.id;

                  return (
                    <tr key={promotor.id}>
                      <td style={estilos.celula}>
                        <strong>{promotor.nome}</strong>
                      </td>

                      <td style={estilos.celula}>
                        {formatarData(promotor.criado_em)}
                      </td>

                      <td style={estilos.celula}>
                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: ativo ? '#edf5ef' : '#f7eeee',
                            color: ativo ? '#557664' : '#8b6b6b',
                          }}
                        >
                          {ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td style={estilos.celula}>
                        <div style={estilos.acoes}>
                          <button
                            type="button"
                            style={{
                              ...estilos.botaoAcao,
                              ...(atualizando ? estilos.desabilitado : {}),
                            }}
                            onClick={() => abrirEdicao(promotor)}
                            disabled={atualizando}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            style={{
                              ...estilos.botaoAcao,
                              ...(atualizando ? estilos.desabilitado : {}),
                            }}
                            onClick={() =>
                              void handleToggleStatus(promotor)
                            }
                            disabled={atualizando}
                          >
                            {atualizando
                              ? 'Aguarde...'
                              : ativo
                                ? 'Desativar'
                                : 'Reativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de cadastro e edição */}
      {modalOpen && (
        <div
          style={estilos.modalFundo}
          onMouseDown={fecharModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-promotor"
            style={estilos.modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3
              id="titulo-modal-promotor"
              style={{ margin: 0, color: '#25312c' }}
            >
              {promotorEditando
                ? 'Editar promotor'
                : 'Cadastrar promotor'}
            </h3>

            <p style={estilos.descricao}>
              {promotorEditando
                ? 'Altere o nome do promotor.'
                : 'Informe o nome do novo promotor.'}
            </p>

            <form onSubmit={handleSubmit}>
              <div style={estilos.campoGrupo}>
                <label
                  htmlFor="nome-promotor"
                  style={estilos.label}
                >
                  Nome do promotor
                </label>

                <input
                  id="nome-promotor"
                  type="text"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Digite o nome completo"
                  maxLength={100}
                  required
                  autoFocus
                  style={estilos.campo}
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  style={{
                    color: '#a33b35',
                    fontSize: '13px',
                    marginTop: '12px',
                  }}
                >
                  {formError}
                </p>
              )}

              <div style={estilos.modalAcoes}>
                <button
                  type="button"
                  style={{
                    ...estilos.botao,
                    ...estilos.secundario,
                  }}
                  onClick={fecharModal}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    ...estilos.botao,
                    ...estilos.primario,
                    ...(saving || !nome.trim()
                      ? estilos.desabilitado
                      : {}),
                  }}
                  disabled={saving || !nome.trim()}
                >
                  {saving
                    ? 'Salvando...'
                    : promotorEditando
                      ? 'Salvar alterações'
                      : 'Cadastrar promotor'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}