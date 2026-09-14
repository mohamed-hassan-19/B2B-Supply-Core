'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE "Invoices"
      SET due_date = "Invoices"."createdAt" + (
        COALESCE((
          SELECT credit_terms FROM "Clients"
          JOIN "Orders" ON "Orders".client_id = "Clients".id
          WHERE "Orders".id = "Invoices".order_id
        ), 0) || ' days'
      )::interval
      WHERE due_date IS NULL AND order_id IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {}
};
