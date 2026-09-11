'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Products', 'dozen_quantity', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('Products', 'dozen_price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('OrderItems', 'purchase_unit', {
      type: Sequelize.ENUM('single', 'dozen'),
      allowNull: false,
      defaultValue: 'single',
    });
    await queryInterface.addColumn('OrderItems', 'dozen_size_at_purchase', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('QuoteItems', 'purchase_unit', {
      type: Sequelize.ENUM('single', 'dozen'),
      allowNull: false,
      defaultValue: 'single',
    });
    await queryInterface.addColumn('QuoteItems', 'dozen_size_at_purchase', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('QuoteItems', 'dozen_size_at_purchase');
    await queryInterface.removeColumn('QuoteItems', 'purchase_unit');
    await queryInterface.removeColumn('OrderItems', 'dozen_size_at_purchase');
    await queryInterface.removeColumn('OrderItems', 'purchase_unit');
    await queryInterface.removeColumn('Products', 'dozen_price');
    await queryInterface.removeColumn('Products', 'dozen_quantity');
    
    // Removing the ENUM type might be necessary in Postgres depending on Sequelize version
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_OrderItems_purchase_unit";').catch(() => {});
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_QuoteItems_purchase_unit";').catch(() => {});
  }
};
