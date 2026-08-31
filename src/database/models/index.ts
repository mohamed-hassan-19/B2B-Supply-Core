import { Sequelize } from 'sequelize';
import { Client, initClient } from './client.model';
import { AdminUser, initAdminUser } from './admin-user.model';
import { Product, initProduct } from './product.model';
import { Order, initOrder } from './order.model';
import { OrderItem, initOrderItem } from './order-item.model';
import { Quote, initQuote } from './quote.model';
import { QuoteItem, initQuoteItem } from './quote-item.model';
import { Invoice, initInvoice } from './invoice.model';
import { InvoiceSequence, initInvoiceSequence } from './invoicesequence.model';

export const setupModels = (sequelize: Sequelize) => {
  // Init models
  initClient(sequelize);
  initAdminUser(sequelize);
  initProduct(sequelize);
  initOrder(sequelize);
  initOrderItem(sequelize);
  initQuote(sequelize);
  initQuoteItem(sequelize);
  initInvoice(sequelize);
  initInvoiceSequence(sequelize);

  // Setup associations
  
  // Client <-> Order
  Client.hasMany(Order, { foreignKey: 'client_id' });
  Order.belongsTo(Client, { foreignKey: 'client_id' });

  // Order <-> OrderItem
  Order.hasMany(OrderItem, { foreignKey: 'order_id' });
  OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

  // OrderItem <-> Product
  Product.hasMany(OrderItem, { foreignKey: 'product_id' });
  OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

  // Order <-> Invoice
  Order.hasOne(Invoice, { foreignKey: 'order_id' });
  Invoice.belongsTo(Order, { foreignKey: 'order_id' });

  // Client <-> Quote
  Client.hasMany(Quote, { foreignKey: 'client_id' });
  Quote.belongsTo(Client, { foreignKey: 'client_id' });

  // Quote <-> QuoteItem
  Quote.hasMany(QuoteItem, { foreignKey: 'quote_id' });
  QuoteItem.belongsTo(Quote, { foreignKey: 'quote_id' });

  // QuoteItem <-> Product
  Product.hasMany(QuoteItem, { foreignKey: 'product_id' });
  QuoteItem.belongsTo(Product, { foreignKey: 'product_id' });

  // Quote <-> Order (if accepted)
  Order.hasOne(Quote, { foreignKey: 'order_id' });
  Quote.belongsTo(Order, { foreignKey: 'order_id' });
};

export {
  Client,
  AdminUser,
  Product,
  Order,
  OrderItem,
  Quote,
  QuoteItem,
  Invoice,
  InvoiceSequence
};
