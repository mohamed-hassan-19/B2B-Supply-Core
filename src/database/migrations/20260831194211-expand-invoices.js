module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modify enum type for payment_status to add 'void'
    // Postgres specific ENUM update:
    await queryInterface.sequelize.query(`ALTER TYPE "enum_Invoices_payment_status" ADD VALUE 'void'`);

    await queryInterface.addColumn('Invoices', 'invoice_number', {
      type: Sequelize.STRING,
      unique: true
    });
    await queryInterface.addColumn('Invoices', 'subtotal', {
      type: Sequelize.DECIMAL(10, 2)
    });
    await queryInterface.addColumn('Invoices', 'tax_rate', {
      type: Sequelize.DECIMAL(5, 4)
    });
    await queryInterface.addColumn('Invoices', 'tax_amount', {
      type: Sequelize.DECIMAL(10, 2)
    });
    await queryInterface.addColumn('Invoices', 'grand_total', {
      type: Sequelize.DECIMAL(10, 2)
    });
    await queryInterface.addColumn('Invoices', 'currency', {
      type: Sequelize.STRING,
      defaultValue: 'EGP'
    });
    await queryInterface.addColumn('Invoices', 'payment_method', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Invoices', 'sales_order_reference', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Invoices', 'customer_tax_id', {
      type: Sequelize.STRING
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Invoices', 'invoice_number');
    await queryInterface.removeColumn('Invoices', 'subtotal');
    await queryInterface.removeColumn('Invoices', 'tax_rate');
    await queryInterface.removeColumn('Invoices', 'tax_amount');
    await queryInterface.removeColumn('Invoices', 'grand_total');
    await queryInterface.removeColumn('Invoices', 'currency');
    await queryInterface.removeColumn('Invoices', 'payment_method');
    await queryInterface.removeColumn('Invoices', 'sales_order_reference');
    await queryInterface.removeColumn('Invoices', 'customer_tax_id');
    // Note: Removing ENUM values in Postgres is complex, typically skipped in down.
  }
};
