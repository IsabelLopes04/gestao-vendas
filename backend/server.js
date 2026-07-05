// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'API rodando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

const pool = require('./db');

app.get('/teste-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS resultado');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Falha na conexão com o banco' });
  }
});

const vendasRoutes = require('./routes/vendas.routes');
app.use('/api/vendas', vendasRoutes);