const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'procurement_db',
  logging: false,
});

const AdminUser = sequelize.define('AdminUser', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('super_admin', 'sales', 'warehouse', 'finance'), allowNull: false },
}, {
  tableName: 'AdminUsers',
});

async function seedAdmin() {
  try {
    await sequelize.authenticate();
    
    const email = 'admin@example.com';
    const password = 'password123';
    const name = 'Super Admin';
    const role = 'super_admin';

    const existingAdmin = await AdminUser.findOne({ where: { email } });
    if (existingAdmin) {
      console.log(`Admin user with email ${email} already exists.`);
      process.exit(0);
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    await AdminUser.create({
      name,
      email,
      password_hash,
      role
    });

    console.log(`Successfully created admin user: ${email} / ${password} (Role: ${role})`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  }
}

seedAdmin();
