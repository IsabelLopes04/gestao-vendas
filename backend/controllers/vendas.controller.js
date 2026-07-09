  const pool = require('../db');

  // GET listar vendas cadastradas
  exports.listarVendas = async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM vendas ORDER BY criado_em DESC');
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao buscar vendas' });
    }
  };
  // POST criar vendas
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
  // DELETE 
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

  // GET - ranking dos promotores cadastrados
  exports.rankingPromotores = async (req, res) => {
    try {
      const { mes } = req.query; // formato: '2026-07'

      let sql = `
        SELECT 
          promotor,
          COUNT(*) AS total_vendas,
          SUM(clinico + raspagem + inicio) AS faturamento_total
        FROM vendas
        WHERE 1=1
      `;
      const params = [];

      if (mes) {
        sql += ' AND DATE_FORMAT(data_venda, "%Y-%m") = ?';
        params.push(mes);
      }

      sql += ' GROUP BY promotor ORDER BY faturamento_total DESC';

      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao buscar ranking' });
    }
  };

    // PUT editar vendas
  exports.editarVenda = async (req, res) => {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Nenhum dado enviado no corpo da requisição' });
      }
      const { id } = req.params;
      const { codigo, paciente, promotor, clinico, raspagem, inicio, data_venda } = req.body;

      if (!codigo || !paciente || !promotor || !data_venda) {
        return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
      }

      const sql = `
        UPDATE vendas
        SET codigo = ?, paciente = ?, promotor = ?, clinico = ?, raspagem = ?, inicio = ?, data_venda = ?
        WHERE id = ?
      `;
      const params = [
        codigo,
        paciente,
        promotor,
        clinico || 0,
        raspagem || 0,
        inicio || 0,
        data_venda,
        id,
      ];

      const [result] = await pool.query(sql, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({ erro: 'Venda não encontrada' });
      }

      res.json({ mensagem: 'Venda atualizada com sucesso', id, ...req.body });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao editar venda' });
    }
  };
  