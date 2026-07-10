//só define as funções que conversam com o backend (esse arquivo que você acabou de criar)

// frontend/js/api.js

const API_URL = 'http://localhost:3000/api';

// ===== VENDAS =====

async function buscarVendas(filtros = {}) {
  const params = new URLSearchParams(filtros);
  const response = await fetch(`${API_URL}/vendas?${params}`);
  if (!response.ok) throw new Error('Erro ao buscar vendas');
  return response.json();
}

async function criarVenda(dados) {
  const response = await fetch(`${API_URL}/vendas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error('Erro ao criar venda');
  return response.json();
}

async function editarVenda(id, dados) {
  const response = await fetch(`${API_URL}/vendas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error('Erro ao editar venda');
  return response.json();
}

async function deletarVenda(id) {
  const response = await fetch(`${API_URL}/vendas/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao deletar venda');
  return response.json();
}

async function buscarRanking(mes = '') {
  const params = mes ? `?mes=${mes}` : '';
  const response = await fetch(`${API_URL}/vendas/rankingPromotores${params}`);
  if (!response.ok) throw new Error('Erro ao buscar ranking');
  return response.json();
}

// ===== METAS =====

async function buscarMetas(mes) {
  const response = await fetch(`${API_URL}/metas?mes=${mes}`);
  if (!response.ok) throw new Error('Erro ao buscar metas');
  return response.json();
}

async function salvarMeta(dados) {
  const response = await fetch(`${API_URL}/metas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error('Erro ao salvar meta');
  return response.json();
}

// ===== RELATÓRIOS =====

async function baixarRelatorioPDF(filtros = {}) {
  const params = new URLSearchParams(filtros);
  const response = await fetch(`${API_URL}/relatorios/pdf?${params}`);
  if (!response.ok) throw new Error('Erro ao gerar relatório');

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'relatorio-vendas.pdf';
  link.click();
  window.URL.revokeObjectURL(url);
}