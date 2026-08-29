'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Clients', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      company_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      commercial_registration: {
        type: Sequelize.STRING
      },
      tax_registration: {
        type: Sequelize.STRING
      },
      contact_details: {
        type: Sequelize.JSON
      },
      payment_method: {
        type: Sequelize.ENUM('COD', 'Credit')
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      credit_limit: {
        type: Sequelize.DECIMAL(10, 2)
      },
      credit_terms: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Clients');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Clients_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Clients_status";');
  }
};
