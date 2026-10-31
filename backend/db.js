// Conexão com o banco de dados MySQL

require('dotenv').config();

const mysql = require('mysql2/promise');

// Verifica se as configurações necessárias foram preenchidas
const variaveisObrigatorias = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME'
];

const variaveisAusentes = variaveisObrigatorias.filter(
  (nome) => !process.env[nome]
);

if (variaveisAusentes.length > 0) {
  throw new Error(
    `Configure as variáveis no .env: ${variaveisAusentes.join(', ')}`
  );
}

// Cria o pool de conexões
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  dateStrings: true,
  decimalNumbers: true
});

module.exports = pool;