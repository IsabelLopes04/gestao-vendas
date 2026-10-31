const pool = require('../db');

// Valida o formato do mês: YYYY-MM.
function mesValido(mes) {
  return typeof mes === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

// Valida o ID recebido pela URL.
function idValido(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
}

// Valida os valores das metas.
function numeroMeta(valor, nome, inteiro = false) {
  if (valor === undefined || valor === null || valor === '') {
    return { valor: 0 };
  }

  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    (inteiro && !Number.isInteger(numero))
  ) {
    return {
      erro: inteiro
        ? `${nome} deve ser um número inteiro maior ou igual a zero`
        : `${nome} deve ser um número maior ou igual a zero`
    };
  }

  return { valor: numero };
}


// GET /api/metas?mes=AAAA-MM
// Lista as metas cadastradas.
exports.listarMetas = async (req, res) => {
  try {
    const { mes } = req.query;

    if (mes !== undefined && !mesValido(mes)) {
      return res.status(400).json({
        erro: 'mes deve estar no formato YYYY-MM'
      });
    }

    let sql = `
      SELECT
        id,
        mes_referencia,
        promotor,
        meta_vendas,
        meta_faturamento
      FROM metas
      WHERE 1 = 1
    `;

    const params = [];

    // Permite filtrar as metas por mês.
    if (mes) {
      sql += ' AND mes_referencia = ?';
      params.push(mes);
    }

    sql += ' ORDER BY promotor IS NULL DESC, promotor ASC';

    const [rows] = await pool.query(sql, params);

    res.json(rows);

  } catch (err) {
    console.error('Erro ao listar metas:', err);

    res.status(500).json({
      erro: 'Erro ao buscar metas'
    });
  }
};


// POST /api/metas
// Cadastra ou atualiza uma meta.
exports.criarOuAtualizarMeta = async (req, res) => {
  try {
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        erro: 'Envie os dados da meta no corpo da requisição'
      });
    }

    const { mes_referencia, promotor } = req.body;

    if (!mesValido(mes_referencia)) {
      return res.status(400).json({
        erro: 'mes_referencia deve estar no formato YYYY-MM'
      });
    }

    // Promotor nulo representa a meta geral da clínica.
    let promotorNormalizado = null;

    if (promotor !== undefined && promotor !== null) {
      if (typeof promotor !== 'string') {
        return res.status(400).json({
          erro: 'promotor deve ser um texto ou null'
        });
      }

      promotorNormalizado = promotor.trim() || null;

      if (
        promotorNormalizado &&
        promotorNormalizado.length > 100
      ) {
        return res.status(400).json({
          erro: 'promotor deve ter no máximo 100 caracteres'
        });
      }
    }

    const metaVendas = numeroMeta(
      req.body.meta_vendas,
      'meta_vendas',
      true
    );

    const metaFaturamento = numeroMeta(
      req.body.meta_faturamento,
      'meta_faturamento'
    );

    if (metaVendas.erro) {
      return res.status(400).json({
        erro: metaVendas.erro
      });
    }

    if (metaFaturamento.erro) {
      return res.status(400).json({
        erro: metaFaturamento.erro
      });
    }

    // Se já existir uma meta para o mês e promotor,
    // atualiza os valores em vez de criar uma duplicada.
    const [result] = await pool.query(
      `INSERT INTO metas
        (mes_referencia, promotor, meta_vendas, meta_faturamento)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id),
         meta_vendas = VALUES(meta_vendas),
         meta_faturamento = VALUES(meta_faturamento)`,
      [
        mes_referencia,
        promotorNormalizado,
        metaVendas.valor,
        metaFaturamento.valor
      ]
    );

    res.status(200).json({
      mensagem: 'Meta salva com sucesso',
      id: result.insertId,
      mes_referencia,
      promotor: promotorNormalizado,
      meta_vendas: metaVendas.valor,
      meta_faturamento: metaFaturamento.valor
    });

  } catch (err) {
    console.error('Erro ao salvar meta:', err);

    res.status(500).json({
      erro: 'Erro ao salvar meta'
    });
  }
};


// DELETE /api/metas/:id
// Exclui uma meta pelo ID.
exports.deletarMeta = async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({
        erro: 'ID da meta inválido'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM metas WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Meta não encontrada'
      });
    }

    res.json({
      mensagem: 'Meta deletada com sucesso'
    });

  } catch (err) {
    console.error('Erro ao deletar meta:', err);

    res.status(500).json({
      erro: 'Erro ao deletar meta'
    });
  }
};