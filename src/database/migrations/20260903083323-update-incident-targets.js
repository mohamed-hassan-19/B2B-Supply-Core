'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add product_id column
    await queryInterface.addColumn('Incidents', 'product_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. Modify order_id to allow null
    await queryInterface.changeColumn('Incidents', 'order_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // We would need to set any null order_ids to something valid before setting it back to allowNull: false
    // For this down migration, we assume we might fail if there are nulls. We can just run it.
    await queryInterface.changeColumn('Incidents', 'order_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.removeColumn('Incidents', 'product_id');
  }
};
