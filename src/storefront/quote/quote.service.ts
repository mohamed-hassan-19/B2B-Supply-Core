import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Quote, QuoteItem, Order, OrderItem, Product, Client, Invoice } from '../../database/models';
import { Op } from 'sequelize';

@Injectable()
export class QuoteService {
  async findAll(clientId: number) {
    return Quote.findAll({
      where: { client_id: clientId, status: 'sent' },
      include: [{ model: QuoteItem }],
      order: [['id', 'DESC']]
    });
  }

  async acceptQuote(clientId: number, quoteId: number, paymentMethod: 'COD' | 'Credit') {
    if (!Product.sequelize) throw new Error('Sequelize not found');
    const t = await Product.sequelize.transaction();

    try {
      // 1. Fetch Quote & Client
      const quote = await Quote.findOne({
        where: { id: quoteId, client_id: clientId },
        include: [{ model: QuoteItem }],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!quote) throw new NotFoundException('Quote not found');
      if (quote.status !== 'sent') throw new BadRequestException(`Cannot accept quote in '${quote.status}' status`);

      const client = await Client.findByPk(clientId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!client || client.status !== 'approved') {
        throw new ForbiddenException('Client is not approved to place orders');
      }

      // 2. Process Items and Calculate Total
      let totalAmount = 0;
      const orderItemsData: any[] = [];
      const quoteItems = await QuoteItem.findAll({ where: { quote_id: quote.id }, transaction: t });

      const productIds = quoteItems.map(qi => qi.product_id).filter(id => id !== null) as number[];
      productIds.sort((a, b) => a - b);

      const products = await Product.findAll({
        where: { id: productIds },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      const productMap = new Map<number, Product>();
      products.forEach(p => productMap.set(p.id, p));

      for (const qi of quoteItems) {
        if (!qi.product_id) continue;
        const product = productMap.get(qi.product_id);
        if (!product || !product.is_active) {
          throw new BadRequestException(`Product for Quote Item is unavailable`);
        }
        if (product.stock_level < qi.requested_quantity) {
          throw new BadRequestException(`Insufficient stock for quoted product`);
        }

        const price = qi.quoted_price ?? product.price;
        totalAmount += Number(price) * qi.requested_quantity;

        orderItemsData.push({
          product_id: product.id,
          product_name: product.name,
          quantity: qi.requested_quantity,
          unit_price: price
        });

        product.stock_level -= qi.requested_quantity;
        await product.save({ transaction: t });
      }

      // 3. Credit Check if Credit
      if (paymentMethod === 'Credit') {
        if (!client.credit_limit || client.credit_limit <= 0) {
          throw new BadRequestException('Client has no credit limit.');
        }

        const unpaidInvoices = await Invoice.findAll({
          where: { payment_status: { [Op.ne]: 'paid' } },
          include: [{ model: Order, where: { client_id: client.id }, attributes: [] }],
          transaction: t
        });
        const unpaidInvoiceTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        const activeCreditOrders = await Order.findAll({
          where: {
            client_id: client.id,
            payment_method: 'Credit',
            status: { [Op.notIn]: ['delivered', 'cancelled'] }
          },
          transaction: t
        });
        const activeOrdersTotal = activeCreditOrders.reduce((sum, ord) => sum + Number(ord.total_amount), 0);

        const totalExposure = unpaidInvoiceTotal + activeOrdersTotal + totalAmount;
        if (totalExposure > client.credit_limit) {
          throw new BadRequestException(`Credit limit exceeded by quote acceptance. Total exposure would be $${totalExposure}`);
        }
      }

      // 4. Create Order
      const order = await Order.create({
        client_id: client.id,
        status: 'pending',
        payment_method: paymentMethod,
        total_amount: totalAmount
      }, { transaction: t });

      for (const itemData of orderItemsData) {
        await OrderItem.create({
          order_id: order.id,
          ...itemData
        }, { transaction: t });
      }

      // 5. Update Quote
      await quote.update({ status: 'accepted', order_id: order.id }, { transaction: t });

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async rejectQuote(clientId: number, quoteId: number) {
    const quote = await Quote.findOne({ where: { id: quoteId, client_id: clientId } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'sent') throw new BadRequestException(`Cannot reject quote in '${quote.status}' status`);

    return quote.update({ status: 'rejected' });
  }
}
