const { Pool } = require('pg');
const { databaseUrl } = require('./config');

const pool = new Pool({
  connectionString: databaseUrl
});

async function query(text, params) {
  return pool.query(text, params);
}

async function healthcheck() {
  await query('SELECT 1');
}

module.exports = {
  pool,
  query,
  healthcheck
};
