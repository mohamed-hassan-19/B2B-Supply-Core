'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_OrderActivityLogs_action_type" ADD VALUE 'created_manually';`);
  },

  down: async (queryInterface, Sequelize) => {
    // No-op
  }
};