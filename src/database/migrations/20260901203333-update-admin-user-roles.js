'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_AdminUsers_role" ADD VALUE IF NOT EXISTS 'content';`);
    await queryInterface.sequelize.query(`ALTER TYPE "enum_AdminUsers_role" ADD VALUE IF NOT EXISTS 'operator';`);
  },

  async down(queryInterface, Sequelize) {
    // ENUM values cannot be easily removed in postgres, so down is a no-op or would require recreating the type.
    // For safety, we just leave them.
  }
};
