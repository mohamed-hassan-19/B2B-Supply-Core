'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_OrderActivityLogs_action_type" ADD VALUE 'item_cancelled';`);
  },

  async down (queryInterface, Sequelize) {
    // Postgres does not support removing enum values easily. We'll leave it.
  }
};
