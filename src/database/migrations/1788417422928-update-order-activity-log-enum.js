'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new values to the enum_OrderActivityLogs_action_type in Postgres
    await queryInterface.sequelize.query(`ALTER TYPE "enum_OrderActivityLogs_action_type" ADD VALUE 'incident_raised';`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_OrderActivityLogs_action_type" ADD VALUE 'incident_resolved';`);
  },

  down: async (queryInterface, Sequelize) => {
    // Postgres doesn't easily support dropping enum values. 
    // Usually you'd have to rename the type, create a new one, drop the old, and update columns.
    // For this migration, down is a no-op or simply throws an error to prevent rollback.
  }
};
