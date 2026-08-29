'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`ALTER TYPE "enum_Orders_status" ADD VALUE 'cancelled';`).catch(e => {
      console.warn('Enum value might already exist or enum name differs:', e.message);
    });
  },

  async down(queryInterface, Sequelize) {
    // Postgres does not support dropping ENUM values easily.
    // It's a one-way operation.
    console.warn('Cannot drop enum value from Postgres');
  }
};
