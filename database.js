const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    // This is the specific line that fixes the "manual install" error:
    dialectModule: require("mysql2"),
  },
);

module.exports = sequelize;
