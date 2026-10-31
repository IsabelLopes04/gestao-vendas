export interface Venda {
  id: number;
  codigo: string;
  paciente: string;
  promotor: string;
  clinico: number | string;
  raspagem: number | string;
  inicio: number | string;
  data_venda: string;
  criado_em?: string;
}

export interface VendaInput {
  codigo: string;
  paciente: string;
  promotor: string;
  clinico: number;
  raspagem: number;
  inicio: number;
  data_venda: string;
}

export interface Meta {
  id: number;
  mes_referencia: string;
  promotor: string | null;
  meta_vendas: number | string;
  meta_faturamento: number | string;
}

export interface MetaInput {
  mes_referencia: string;
  promotor: string | null;
  meta_vendas: number;
  meta_faturamento: number;
}

export interface RankingItem {
  promotor: string;
  total_vendas: number | string;
  faturamento_total: number | string;
}

export interface Promotor {
  id: number;
  nome: string;
  ativo: boolean | number;
  criado_em?: string;
}

export interface PromotorInput {
  nome: string;
}

export type PageKey =
  | 'dashboard'
  | 'sales'
  | 'goals'
  | 'reports'
  | 'promoters';

export interface ReportFilters {
  promotor?: string;
  busca?: string;
  valorMin?: string;
  valorMax?: string;
  mes?: string;
}