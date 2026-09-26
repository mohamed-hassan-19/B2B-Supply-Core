'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PackingMaterials', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      category: { type: Sequelize.STRING, allowNull: false, defaultValue: 'General' },
      stock_quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      low_stock_threshold: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.createTable('OrderPackingMaterialUsages', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Orders', key: 'id' } },
      packing_material_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'PackingMaterials', key: 'id' } },
      quantity_used: { type: Sequelize.INTEGER, allowNull: false },
      used_by_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'AdminUsers', key: 'id' } },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // Update enum for action_type in OrderActivityLogs
    // Note: since Postgres ENUMs can be tricky to alter via queryInterface in an agnostic way,
    // we use a raw query or add the value using ALTER TYPE.
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_OrderActivityLogs_action_type" ADD VALUE IF NOT EXISTS 'packing_material_used';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('OrderPackingMaterialUsages');
    await queryInterface.dropTable('PackingMaterials');
  }
};
