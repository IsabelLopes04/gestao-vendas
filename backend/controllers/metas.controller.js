const pool = require('../db');

// GET /api/metas?mes=2026-07
exports.listarMetas = async (req, res) => {
  try {
    const { mes } = req.query;

    let sql = 'SELECT * FROM metas WHERE 1=1';
    const params = [];

    if (mes) {
      sql += ' AND mes_referencia = ?';
      params.push(mes);
    }

    sql += ' ORDER BY promotor IS NULL DESC, promotor ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar metas' });
  }
};

// POST /api/metas
exports.criarOuAtualizarMeta = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Nenhum dado enviado no corpo da requisição' });
    }

    const { mes_referencia, promotor, meta_vendas, meta_faturamento } = req.body;

    if (!mes_referencia) {
      return res.status(400).json({ erro: 'mes_referencia é obrigatório (formato YYYY-MM)' });
    }

    // Verifica se já existe uma meta pra esse mes + promotor
    let sqlBusca = 'SELECT id FROM metas WHERE mes_referencia = ?';
    const paramsBusca = [mes_referencia];

    if (promotor) {
      sqlBusca += ' AND promotor = ?';
      paramsBusca.push(promotor);
    } else {
      sqlBusca += ' AND promotor IS NULL';
    }

    const [existente] = await pool.query(sqlBusca, paramsBusca);

    if (existente.length > 0) {
      // Já existe -> atualiza
      const sqlUpdate = `
        UPDATE metas
        SET meta_vendas = ?, meta_faturamento = ?
        WHERE id = ?
      `;
      await pool.query(sqlUpdate, [meta_vendas || 0, meta_faturamento || 0, existente[0].id]);
      return res.json({ mensagem: 'Meta atualizada com sucesso', id: existente[0].id });
    }

    // Não existe -> cria
    const sqlInsert = `
      INSERT INTO metas (mes_referencia, promotor, meta_vendas, meta_faturamento)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(sqlInsert, [
      mes_referencia,
      promotor || null,
      meta_vendas || 0,
      meta_faturamento || 0,
    ]);

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar meta' });
  }
};

// DELETE
exports.deletarMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM metas WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Meta não encontrada' });
    }

    res.json({ mensagem: 'Meta deletada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao deletar meta' });
  }
};