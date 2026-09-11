const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/procurement_db');
sequelize.query('ALTER TABLE "Incidents" ALTER COLUMN order_id DROP NOT NULL;').then(()=>console.log('done')).catch(console.error);
