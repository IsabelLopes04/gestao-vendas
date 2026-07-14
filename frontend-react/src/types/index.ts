// src/types/index.ts

export interface Venda {
  id: number;
  codigo: string;
  paciente: string;
  promotor: string;
  clinico: number;
  raspagem: number;
  inicio: number;
  data_venda: string;
  criado_em?: string; //O ? no criado_em?: string,  diz que essa propriedade é opcional, pode existir ou não
}

export interface Meta {
  id: number;
  mes_referencia: string;
  promotor: string | null;
  meta_vendas: number;
  meta_faturamento: number;
}