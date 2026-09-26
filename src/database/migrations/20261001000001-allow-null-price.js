'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Products', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Cannot easily revert if there are actual nulls, but we'll try:
    await queryInterface.changeColumn('Products', 'price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });
  }
};
