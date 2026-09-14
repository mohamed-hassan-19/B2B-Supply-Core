const { Invoice, Client, Order, Quote } = require('./src/database/models');
const Sequelize = require('sequelize');

async function run() {
  const invoices = await Invoice.findAll({
    where: { due_date: null },
    include: [
      { model: Client },
      { model: Order },
      { model: Quote }
    ]
  });
  console.log(Found  invoices with null due_date.);
  for (const inv of invoices) {
    let client = inv.Client;
    if (!client && inv.Order) client = await Client.findByPk(inv.Order.client_id);
    if (!client && inv.Quote) client = await Client.findByPk(inv.Quote.client_id);
    if (!client && inv.client_id) client = await Client.findByPk(inv.client_id); // In case direct relation exists
    
    const terms = client?.credit_terms || 0;
    const createdAt = inv.createdAt || new Date();
    const dueDate = new Date(createdAt.getTime() + terms * 24 * 60 * 60 * 1000);
    
    await inv.update({ due_date: dueDate });
    console.log(Updated invoice : due_date = );
  }
  console.log('Backfill complete.');
}

run().catch(console.error).finally(() => process.exit(0));
