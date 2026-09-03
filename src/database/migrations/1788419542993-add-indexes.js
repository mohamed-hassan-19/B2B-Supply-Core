'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const queries = [
      'CREATE INDEX IF NOT EXISTS "orders_created_at" ON "Orders" ("createdAt");',
      'CREATE INDEX IF NOT EXISTS "quotes_created_at" ON "Quotes" ("createdAt");',
      'CREATE INDEX IF NOT EXISTS "invoices_created_at" ON "Invoices" ("createdAt");',
      'CREATE INDEX IF NOT EXISTS "clients_created_at" ON "Clients" ("createdAt");',
      'CREATE INDEX IF NOT EXISTS "products_created_at" ON "Products" ("createdAt");',
      'CREATE INDEX IF NOT EXISTS "incidents_created_at" ON "Incidents" ("createdAt");',
      'CREATE INDEX IF NOT EXISTS "orders_client_id" ON "Orders" ("client_id");',
      'CREATE INDEX IF NOT EXISTS "quotes_client_id" ON "Quotes" ("client_id");',
      'CREATE INDEX IF NOT EXISTS "orders_status" ON "Orders" ("status");',
      'CREATE INDEX IF NOT EXISTS "quotes_status" ON "Quotes" ("status");',
      'CREATE INDEX IF NOT EXISTS "invoices_payment_status" ON "Invoices" ("payment_status");', // Invoices uses payment_status
      'CREATE INDEX IF NOT EXISTS "incidents_status" ON "Incidents" ("status");'
    ];
    for (const q of queries) {
      await queryInterface.sequelize.query(q);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No-op for now to avoid issues
  }
};
