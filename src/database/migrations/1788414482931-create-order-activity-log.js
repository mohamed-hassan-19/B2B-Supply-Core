'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('OrderActivityLogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action_type: {
        type: Sequelize.ENUM(
          'created',
          'status_changed',
          'discount_changed',
          'revision_proposed',
          'revision_accepted',
          'revision_rejected'
        ),
        allowNull: false
      },
      actor: {
        type: Sequelize.STRING,
        allowNull: false
      },
      from_status: {
        type: Sequelize.STRING,
        allowNull: true
      },
      to_status: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('OrderActivityLogs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_OrderActivityLogs_action_type";');
  }
};
