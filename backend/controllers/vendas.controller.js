const pool = require('../db');

// GET /api/vendas
exports.listarVendas = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vendas ORDER BY criado_em DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar vendas' });
  }
};
// POST /api/vendas
exports.criarVenda = async (req, res) => {
  try {
    const { codigo, paciente, promotor, clinico, raspagem, inicio, data_venda } = req.body;

    // validação básica
    if (!codigo || !paciente || !promotor || !data_venda) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
    }

    const sql = `
      INSERT INTO vendas (codigo, paciente, promotor, clinico, raspagem, inicio, data_venda)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      codigo,
      paciente,
      promotor,
      clinico || 0,
      raspagem || 0,
      inicio || 0,
      data_venda,
    ];

    const [result] = await pool.query(sql, params);
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar venda' });
  }
};
// DELETE /api/vendas/:id
exports.deletarVenda = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM vendas WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Venda não encontrada' });
    }

    res.json({ mensagem: 'Venda deletada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao deletar venda' });
  }
};