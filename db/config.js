/* eslint-disable @typescript-eslint/no-require-imports -- sequelize-cli loads this file via require(), so it must stay CommonJS */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
