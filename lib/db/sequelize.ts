import { Sequelize } from "sequelize";

declare global {
  var __sequelize__: Sequelize | undefined;
}

function createSequelize() {
  return new Sequelize({
    dialect: "mysql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
  });
}

// Reused across Next.js dev hot-reloads so we don't open a new connection pool per edit.
export const sequelize = global.__sequelize__ ?? createSequelize();

if (process.env.NODE_ENV !== "production") {
  global.__sequelize__ = sequelize;
}
