const pool = require('../db');

// Soma os valores dos procedimentos para calcular o total da venda.
const totalVendaSQL = `(
  COALESCE(clinico, 0) +
  COALESCE(raspagem, 0) +
  COALESCE(inicio, 0)
)`;

// Verifica se a data existe e está no formato YYYY-MM-DD.
function dataValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const dataConvertida = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    dataConvertida.getUTCFullYear() === ano &&
    dataConvertida.getUTCMonth() === mes - 1 &&
    dataConvertida.getUTCDate() === dia
  );
}

// Valida valores numéricos e impede números negativos.
function numeroNaoNegativo(valor, nome, padrao = 0) {
  if (valor === undefined || valor === null || valor === '') {
    return { valor: padrao };
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return { erro: `${nome} deve ser um número maior ou igual a zero` };
  }

  return { valor: numero };
}

// Organiza e valida os dados recebidos no cadastro ou edição.
function prepararDadosVenda(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { erro: 'Envie os dados da venda no corpo da requisição' };
  }

  const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : '';
  const paciente = typeof body.paciente === 'string' ? body.paciente.trim() : '';
  const promotor = typeof body.promotor === 'string' ? body.promotor.trim() : '';

  if (!codigo || !paciente || !promotor || !body.data_venda) {
    return {
      erro: 'Código, paciente, promotor e data da venda são obrigatórios'
    };
  }

  if (codigo.length > 50 || paciente.length > 150 || promotor.length > 100) {
    return {
      erro: 'Confira o tamanho dos campos: código (50), paciente (150) e promotor (100) caracteres'
    };
  }

  if (!dataValida(body.data_venda)) {
    return {
      erro: 'data_venda deve ser uma data válida no formato YYYY-MM-DD'
    };
  }

  const clinico = numeroNaoNegativo(body.clinico, 'clinico');
  const raspagem = numeroNaoNegativo(body.raspagem, 'raspagem');
  const inicio = numeroNaoNegativo(body.inicio, 'inicio');

  if (clinico.erro) return clinico;
  if (raspagem.erro) return raspagem;
  if (inicio.erro) return inicio;

  return {
    dados: {
      codigo,
      paciente,
      promotor,
      clinico: clinico.valor,
      raspagem: raspagem.valor,
      inicio: inicio.valor,
      data_venda: body.data_venda
    }
  };
}

// Valida o ID recebido pela URL.
function idValido(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
}

// Valida os filtros de valor mínimo e máximo.
function lerFiltroNumerico(valor, nome) {
  if (valor === undefined || valor === '') {
    return { valor: null };
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return {
      erro: `${nome} deve ser um número maior ou igual a zero`
    };
  }

  return { valor: numero };
}

// Valida o mês no formato YYYY-MM.
function mesValido(mes) {
  return typeof mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}


// GET /api/vendas
// Lista as vendas e permite aplicar filtros.
exports.listarVendas = async (req, res) => {
  try {
    const { promotor, busca, valorMin, valorMax } = req.query;

    if (promotor !== undefined && typeof promotor !== 'string') {
      return res.status(400).json({
        erro: 'O filtro promotor deve ser um texto'
      });
    }

    if (busca !== undefined && typeof busca !== 'string') {
      return res.status(400).json({
        erro: 'O filtro busca deve ser um texto'
      });
    }

    const minimo = lerFiltroNumerico(valorMin, 'valorMin');
    const maximo = lerFiltroNumerico(valorMax, 'valorMax');

    if (minimo.erro) {
      return res.status(400).json({ erro: minimo.erro });
    }

    if (maximo.erro) {
      return res.status(400).json({ erro: maximo.erro });
    }

    if (
      minimo.valor !== null &&
      maximo.valor !== null &&
      minimo.valor > maximo.valor
    ) {
      return res.status(400).json({
        erro: 'valorMin não pode ser maior que valorMax'
      });
    }

    let sql = 'SELECT * FROM vendas WHERE 1 = 1';
    const params = [];

    if (promotor && promotor.trim()) {
      sql += ' AND promotor = ?';
      params.push(promotor.trim());
    }

    if (busca && busca.trim()) {
      sql += ' AND (codigo LIKE ? OR paciente LIKE ?)';
      params.push(`%${busca.trim()}%`, `%${busca.trim()}%`);
    }

    if (minimo.valor !== null) {
      sql += ` AND ${totalVendaSQL} >= ?`;
      params.push(minimo.valor);
    }

    if (maximo.valor !== null) {
      sql += ` AND ${totalVendaSQL} <= ?`;
      params.push(maximo.valor);
    }

    sql += ' ORDER BY data_venda DESC, criado_em DESC';

    const [rows] = await pool.query(sql, params);

    res.json(rows);

  } catch (err) {
    console.error('Erro ao listar vendas:', err);

    res.status(500).json({
      erro: 'Erro ao buscar vendas'
    });
  }
};


// POST /api/vendas
// Cadastra uma nova venda.
exports.criarVenda = async (req, res) => {
  try {
    const validacao = prepararDadosVenda(req.body);

    if (validacao.erro) {
      return res.status(400).json({
        erro: validacao.erro
      });
    }

    const {
      codigo,
      paciente,
      promotor,
      clinico,
      raspagem,
      inicio,
      data_venda
    } = validacao.dados;

    const sql = `
      INSERT INTO vendas
        (codigo, paciente, promotor, clinico, raspagem, inicio, data_venda)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      codigo,
      paciente,
      promotor,
      clinico,
      raspagem,
      inicio,
      data_venda
    ]);

    res.status(201).json({
      id: result.insertId,
      ...validacao.dados
    });

  } catch (err) {
    console.error('Erro ao criar venda:', err);

    res.status(500).json({
      erro: 'Erro ao criar venda'
    });
  }
};


// PUT /api/vendas/:id
// Atualiza os dados de uma venda existente.
exports.editarVenda = async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        erro: 'ID da venda inválido'
      });
    }

    const validacao = prepararDadosVenda(req.body);

    if (validacao.erro) {
      return res.status(400).json({
        erro: validacao.erro
      });
    }

    const [existente] = await pool.query(
      'SELECT id FROM vendas WHERE id = ?',
      [id]
    );

    if (existente.length === 0) {
      return res.status(404).json({
        erro: 'Venda não encontrada'
      });
    }

    const {
      codigo,
      paciente,
      promotor,
      clinico,
      raspagem,
      inicio,
      data_venda
    } = validacao.dados;

    await pool.query(
      `UPDATE vendas
       SET codigo = ?, paciente = ?, promotor = ?, clinico = ?,
           raspagem = ?, inicio = ?, data_venda = ?
       WHERE id = ?`,
      [
        codigo,
        paciente,
        promotor,
        clinico,
        raspagem,
        inicio,
        data_venda,
        id
      ]
    );

    res.json({
      mensagem: 'Venda atualizada com sucesso',
      id: Number(id),
      ...validacao.dados
    });

  } catch (err) {
    console.error('Erro ao editar venda:', err);

    res.status(500).json({
      erro: 'Erro ao editar venda'
    });
  }
};


// DELETE /api/vendas/:id
// Exclui uma venda pelo ID.
exports.deletarVenda = async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        erro: 'ID da venda inválido'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM vendas WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Venda não encontrada'
      });
    }

    res.json({
      mensagem: 'Venda deletada com sucesso'
    });

  } catch (err) {
    console.error('Erro ao deletar venda:', err);

    res.status(500).json({
      erro: 'Erro ao deletar venda'
    });
  }
};


// GET /api/vendas/rankingPromotores?mes=AAAA-MM
// Gera o ranking dos promotores.
exports.rankingPromotores = async (req, res) => {
  try {
    const { mes } = req.query;

    if (mes !== undefined && !mesValido(mes)) {
      return res.status(400).json({
        erro: 'mes deve estar no formato YYYY-MM'
      });
    }

    let sql = `
      SELECT
        promotor,
        COUNT(*) AS total_vendas,
        SUM(${totalVendaSQL}) AS faturamento_total
      FROM vendas
      WHERE 1 = 1
    `;

    const params = [];

    if (mes) {
      const primeiroDia = `${mes}-01`;

      sql += `
        AND data_venda >= ?
        AND data_venda < DATE_ADD(?, INTERVAL 1 MONTH)
      `;

      params.push(primeiroDia, primeiroDia);
    }

    sql += `
      GROUP BY promotor
      ORDER BY faturamento_total DESC, total_vendas DESC
    `;

    const [rows] = await pool.query(sql, params);

    res.json(rows);

  } catch (err) {
    console.error('Erro ao buscar ranking:', err);

    res.status(500).json({
      erro: 'Erro ao buscar ranking'
    });
  }
};