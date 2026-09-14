import { Invoice, Client, Order, Quote } from './src/database/models';
import { Op } from 'sequelize';

async function run() {
  const invoices = await Invoice.findAll({
    where: { due_date: { [Op.is]: null } }
  });
  console.log('Found ' + invoices.length + ' invoices with null due_date.');
  for (const inv of invoices as any[]) {
    let client;
    if (inv.order_id) {
      const order = await Order.findByPk(inv.order_id) as any;
      if (order) client = await Client.findByPk(order.client_id) as any;
    }
    
    const terms = client?.credit_terms || 0;
    const createdAt = inv.createdAt || new Date();
    const dueDate = new Date(createdAt.getTime() + terms * 24 * 60 * 60 * 1000);
    
    await inv.update({ due_date: dueDate });
    console.log('Updated invoice ' + inv.id + ': due_date = ' + dueDate);
  }
  console.log('Backfill complete.');
}

run().catch(console.error).finally(() => process.exit(0));
