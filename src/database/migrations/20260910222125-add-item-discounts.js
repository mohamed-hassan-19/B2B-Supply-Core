'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('OrderItems', 'discount_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });
    await queryInterface.addColumn('OrderItems', 'discount_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.addColumn('QuoteItems', 'discount_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });
    await queryInterface.addColumn('QuoteItems', 'discount_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrderItems', 'discount_percentage');
    await queryInterface.removeColumn('OrderItems', 'discount_amount');
    await queryInterface.removeColumn('QuoteItems', 'discount_percentage');
    await queryInterface.removeColumn('QuoteItems', 'discount_amount');
  }
};
