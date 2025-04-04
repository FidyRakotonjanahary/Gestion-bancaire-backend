const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path')
dotenv.config({ path: path.join(__dirname, '..', 'config', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('connect', () => {
  console.log('Connecté à la base de données PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erreur de connexion à la base de données:', err);
  process.exit(-1);
});

module.exports = pool;