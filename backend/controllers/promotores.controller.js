const pool = require('../db');

function idValido(id) {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
}

function validarNome(nome) {
  if (typeof nome !== 'string' || !nome.trim()) {
    return 'Informe o nome do promotor';
  }

  if (nome.trim().length > 100) {
    return 'O nome deve ter no máximo 100 caracteres';
  }

  return null;
}

// GET /api/promotores
// Lista todos os promotores ou filtra por situação.
exports.listarPromotores = async (req, res) => {
  try {
    const { ativo } = req.query;

    if (ativo !== undefined && !['true', 'false'].includes(ativo)) {
      return res.status(400).json({
        erro: 'O filtro ativo deve ser true ou false'
      });
    }

    let sql = `
      SELECT id, nome, ativo, criado_em
      FROM promotores
    `;

    const params = [];

    if (ativo !== undefined) {
      sql += ' WHERE ativo = ?';
      params.push(ativo === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY ativo DESC, nome ASC';

    const [promotores] = await pool.query(sql, params);

    res.json(promotores);
  } catch (err) {
    console.error('Erro ao listar promotores:', err);
    res.status(500).json({ erro: 'Erro ao buscar promotores' });
  }
};

// POST /api/promotores
// Cadastra um novo promotor.
exports.cadastrarPromotor = async (req, res) => {
  try {
    const { nome } = req.body;

    const erro = validarNome(nome);

    if (erro) {
      return res.status(400).json({ erro });
    }

    const nomeNormalizado = nome.trim();

    const [result] = await pool.query(
      'INSERT INTO promotores (nome) VALUES (?)',
      [nomeNormalizado]
    );

    res.status(201).json({
      mensagem: 'Promotor cadastrado com sucesso',
      id: result.insertId,
      nome: nomeNormalizado,
      ativo: true
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        erro: 'Esse promotor já está cadastrado'
      });
    }

    console.error('Erro ao cadastrar promotor:', err);
    res.status(500).json({ erro: 'Erro ao cadastrar promotor' });
  }
};

// PUT /api/promotores/:id
// Edita o nome de um promotor.
exports.editarPromotor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!idValido(id)) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    const erro = validarNome(nome);

    if (erro) {
      return res.status(400).json({ erro });
    }

    const [existente] = await pool.query(
      'SELECT id FROM promotores WHERE id = ?',
      [id]
    );

    if (existente.length === 0) {
      return res.status(404).json({ erro: 'Promotor não encontrado' });
    }

    const nomeNormalizado = nome.trim();

    await pool.query(
      'UPDATE promotores SET nome = ? WHERE id = ?',
      [nomeNormalizado, id]
    );

    res.json({
      mensagem: 'Promotor atualizado com sucesso',
      id: Number(id),
      nome: nomeNormalizado
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        erro: 'Já existe um promotor com esse nome'
      });
    }

    console.error('Erro ao editar promotor:', err);
    res.status(500).json({ erro: 'Erro ao atualizar promotor' });
  }
};

// PATCH /api/promotores/:id/status
// Ativa ou desativa um promotor.
exports.alterarStatusPromotor = async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    if (!idValido(id)) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({
        erro: 'Informe ativo como true ou false'
      });
    }

    const [existente] = await pool.query(
      'SELECT id FROM promotores WHERE id = ?',
      [id]
    );

    if (existente.length === 0) {
      return res.status(404).json({ erro: 'Promotor não encontrado' });
    }

    await pool.query(
      'UPDATE promotores SET ativo = ? WHERE id = ?',
      [ativo, id]
    );

    res.json({
      mensagem: ativo
        ? 'Promotor ativado com sucesso'
        : 'Promotor desativado com sucesso',
      id: Number(id),
      ativo
    });
  } catch (err) {
    console.error('Erro ao alterar status do promotor:', err);
    res.status(500).json({ erro: 'Erro ao alterar status do promotor' });
  }
};

// DELETE /api/promotores/:id
// Desativa o promotor sem apagar seu histórico.
exports.deletarPromotor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!idValido(id)) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    const [existente] = await pool.query(
      'SELECT id FROM promotores WHERE id = ?',
      [id]
    );

    if (existente.length === 0) {
      return res.status(404).json({ erro: 'Promotor não encontrado' });
    }

    await pool.query(
      'UPDATE promotores SET ativo = FALSE WHERE id = ?',
      [id]
    );

    res.json({
      mensagem: 'Promotor desativado com sucesso'
    });
  } catch (err) {
    console.error('Erro ao desativar promotor:', err);
    res.status(500).json({ erro: 'Erro ao desativar promotor' });
  }
};