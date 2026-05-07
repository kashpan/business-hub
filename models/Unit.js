const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const Unit = sequelize.define("Unit", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: "Office", //Default to Office
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "Active", //Default to Active
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true, //Image are optional
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Unit;
