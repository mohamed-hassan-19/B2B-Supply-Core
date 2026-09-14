'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Clients', 'monthly_average_order_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Clients', 'monthly_average_order_amount');
  }
};
