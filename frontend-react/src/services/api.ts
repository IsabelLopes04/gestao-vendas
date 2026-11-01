import type {
  Meta,
  MetaInput,
  Promotor,
  PromotorInput,
  RankingsPromotores,
  ReportFilters,
  Venda,
  VendaInput,
} from '../types';

// Endereço da API.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '');

type ApiError = {
  erro?: string;
  mensagem?: string;
};

// Função central para realizar requisições.
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      'Não foi possível conectar à API. Confira se o backend está rodando.'
    );
  }

  const contentType = response.headers.get('content-type') || '';

  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({} as ApiError))
    : null;

  if (!response.ok) {
    const apiError = payload as ApiError | null;

    throw new Error(
      apiError?.erro ||
      apiError?.mensagem ||
      `Erro na requisição (${response.status}).`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}

// Monta os parâmetros das URLs.
function toQuery(
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value.trim() !== '') {
      search.set(key, value.trim());
    }
  });

  const query = search.toString();

  return query ? `?${query}` : '';
}

export const api = {

  // =========================
  // VENDAS
  // =========================

  listarVendas: () =>
    request<Venda[]>('/api/vendas'),

  criarVenda: (dados: VendaInput) =>
    request<Venda>('/api/vendas', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  editarVenda: (id: number, dados: VendaInput) =>
    request<{ mensagem: string; id: number }>(
      `/api/vendas/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(dados),
      }
    ),

  excluirVenda: (id: number) =>
    request<{ mensagem: string }>(
      `/api/vendas/${id}`,
      { method: 'DELETE' }
    ),

  // =========================
  // METAS
  // =========================

  listarMetas: (mes: string) =>
    request<Meta[]>(`/api/metas${toQuery({ mes })}`),

  salvarMeta: (dados: MetaInput) =>
    request<{ mensagem: string; id: number }>(
      '/api/metas',
      {
        method: 'POST',
        body: JSON.stringify(dados),
      }
    ),

  excluirMeta: (id: number) =>
    request<{ mensagem: string }>(
      `/api/metas/${id}`,
      { method: 'DELETE' }
    ),

  // =========================
  // PROMOTORES
  // =========================

  listarPromotores: (ativo?: boolean) =>
    request<Promotor[]>(
      `/api/promotores${toQuery({
        ativo: ativo === undefined ? undefined : String(ativo),
      })}`
    ),

  cadastrarPromotor: (dados: PromotorInput) =>
    request<{
      mensagem: string;
      id: number;
      nome: string;
      ativo: boolean;
    }>('/api/promotores', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  editarPromotor: (id: number, dados: PromotorInput) =>
    request<{
      mensagem: string;
      id: number;
      nome: string;
    }>(`/api/promotores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    }),

  alterarStatusPromotor: (id: number, ativo: boolean) =>
    request<{
      mensagem: string;
      id: number;
      ativo: boolean;
    }>(`/api/promotores/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo }),
    }),

  // =========================
  // RANKINGS
  // =========================

  rankingPromotores: (mes: string) =>
    request<RankingsPromotores>(
      `/api/vendas/rankingPromotores${toQuery({ mes })}`
    ),

  // =========================
  // RELATÓRIOS
  // =========================

  async gerarRelatorioPDF(
    filtros: ReportFilters
  ): Promise<Blob> {
    const path = `/api/relatorios/pdf${toQuery({
      promotor: filtros.promotor,
      busca: filtros.busca,
      valorMin: filtros.valorMin,
      valorMax: filtros.valorMax,
      mes: filtros.mes,
    })}`;

    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`);
    } catch {
      throw new Error(
        'Não foi possível conectar à API. Confira se o backend está rodando.'
      );
    }

    if (!response.ok) {
      const erro = (await response.json().catch(() => ({}))) as ApiError;

      throw new Error(
        erro.erro || 'Não foi possível gerar o relatório.'
      );
    }

    return response.blob();
  },
};
