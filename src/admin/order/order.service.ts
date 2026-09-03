import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Order, OrderItem, Product, Client, Invoice, Quote, QuoteItem, OrderActivityLog } from '../../database/models';
import { Op } from 'sequelize';

@Injectable()
export class OrderService {
  async findAll(options: { start_date?: string, end_date?: string, client_id?: number, status?: string, page?: number, limit?: number, export?: string | boolean } = {}) {
    const where: any = {};
    if (options.start_date && options.end_date) {
      where.createdAt = {
        [Op.gte]: new Date(options.start_date),
        [Op.lte]: new Date(options.end_date)
      };
    } else if (options.start_date) {
      where.createdAt = { [Op.gte]: new Date(options.start_date) };
    } else if (options.end_date) {
      where.createdAt = { [Op.lte]: new Date(options.end_date) };
    }

    if (options.client_id) where.client_id = options.client_id;
    if (options.status) where.status = options.status;
    

    const queryOptions: any = { where, order: [['createdAt', 'DESC']] };
    
    // Add specific includes if needed based on entity
    
    
    queryOptions.include = [{ model: require('../../database/models').Client, attributes: ['company_name', 'is_priority'] }];
    
    

    if (options.export && (options.export === 'true' || options.export === true)) {
      const items = await Order.findAll(queryOptions);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    const { count, rows } = await Order.findAndCountAll(queryOptions);

    return {
      items: rows,
      total: count,
      page,
      limit
    };
  }

  async findOne(id: number) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    const items = await OrderItem.findAll({ where: { order_id: id } });
    const client = await Client.findByPk(order.client_id, { attributes: ['id', 'company_name', 'email'] });
    const activity_logs = await OrderActivityLog.findAll({ where: { order_id: id }, order: [['createdAt', 'ASC']] });
    
    return {
      order,
      client,
      items,
      activity_logs
    };
  }

  async updateStatus(id: number, allowedCurrentStatuses: string[], nextStatus: string, actorUser?: any) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (!allowedCurrentStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot change status to '${nextStatus}'. Order is currently '${order.status}' (requires ${allowedCurrentStatuses.join(' or ')}).`
      );
    }

    const from_status = order.status;
    await order.update({ status: nextStatus });

    if (actorUser) {
      await OrderActivityLog.create({
        order_id: order.id,
        action_type: 'status_changed',
        actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
        from_status,
        to_status: nextStatus,
        description: `Status changed from ${from_status} to ${nextStatus}`
      });
    }

    return order;
  }

  async cancelOrder(id: number, actorUser?: any) {
    if (!Product.sequelize) {
      throw new Error('Sequelize instance not found');
    }

    const t = await Product.sequelize.transaction();

    try {
      const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (order.status !== 'pending' && order.status !== 'approved') {
        throw new BadRequestException(
          `Cannot cancel order. Current status is '${order.status}'. Only 'pending' or 'approved' orders can be cancelled.`
        );
      }

      const items = await OrderItem.findAll({ where: { order_id: id }, transaction: t });

      for (const item of items) {
        if (item.product_id) {
          const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
          if (product) {
            product.stock_level += item.quantity;
            await product.save({ transaction: t });
          }
        }
      }

      const invoice = await Invoice.findOne({ where: { order_id: order.id }, transaction: t, lock: t.LOCK.UPDATE });
      if (invoice) {
        await invoice.update({ payment_status: 'void' }, { transaction: t });
      }

      await Quote.update(
        { status: 'expired' },
        { 
          where: { 
            related_order_id: order.id, 
            status: ['pending', 'sent'] 
          }, 
          transaction: t 
        }
      );

      const from_status = order.status;
      await order.update({ status: 'cancelled' }, { transaction: t });

      if (actorUser) {
        await OrderActivityLog.create({
          order_id: order.id,
          action_type: 'status_changed',
          actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
          from_status,
          to_status: 'cancelled',
          description: 'Order cancelled'
        }, { transaction: t });
      }

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async reviseOrder(id: number, actorUser?: any) {
    if (!Product.sequelize) throw new Error('Sequelize instance not found');
    const t = await Product.sequelize.transaction();
    
    try {
      const order = await Order.findByPk(id, { transaction: t });
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      
      if (order.status !== 'pending' && order.status !== 'approved') {
        throw new BadRequestException('Cannot revise order unless it is pending or approved');
      }

      const items = await OrderItem.findAll({ where: { order_id: id }, transaction: t });
      
      // Create draft quote
      const quote = await Quote.create({
        client_id: order.client_id,
        related_order_id: order.id,
        status: 'pending' // draft
      }, { transaction: t });

      // Add all existing items to this quote
      for (const item of items) {
        await QuoteItem.create({
          quote_id: quote.id,
          product_id: item.product_id,
          requested_quantity: item.quantity,
          quoted_price: item.unit_price,
        }, { transaction: t });
      }

      if (actorUser) {
        await OrderActivityLog.create({
          order_id: order.id,
          action_type: 'revision_proposed',
          actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
          description: `Revision draft RFQ-${quote.id} created`
        }, { transaction: t });
      }

      await t.commit();
      
      return { quote_id: quote.id, message: 'Revision quote created successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async applyDiscount(id: number, discount_percentage: number, actorUser?: any) {
    if (!Product.sequelize) throw new Error('Sequelize instance not found');
    const t = await Product.sequelize.transaction();
    
    try {
      const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (order.status !== 'pending' && order.status !== 'approved') {
        throw new BadRequestException(`Cannot apply discount. Order status must be pending or approved.`);
      }

      if (discount_percentage < 0 || discount_percentage > 100) {
        throw new BadRequestException('Invalid discount percentage. Must be between 0 and 100.');
      }

      const items = await OrderItem.findAll({ where: { order_id: id }, transaction: t });
      const itemsSum = items.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0);

      // Compute discount_amount = round(items_sum * discount_percentage / 100, 2)
      const discount_amount = Math.round((itemsSum * discount_percentage / 100) * 100) / 100;

      const discountedTotal = itemsSum - discount_amount;
      const old_discount = order.discount_percentage || 0;
      
      order.discount_percentage = discount_percentage;
      order.discount_amount = discount_amount;
      order.total_amount = discountedTotal;
      await order.save({ transaction: t });

      if (actorUser && old_discount !== discount_percentage) {
        await OrderActivityLog.create({
          order_id: order.id,
          action_type: 'discount_changed',
          actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
          description: `Discount updated from ${old_discount}% to ${discount_percentage}%`
        }, { transaction: t });
      }

      const invoice = await Invoice.findOne({ where: { order_id: order.id }, transaction: t, lock: t.LOCK.UPDATE });
      if (invoice) {
        const taxRate = Number(invoice.tax_rate) || 0.14;
        const newTaxAmount = discountedTotal * taxRate;
        const newGrandTotal = discountedTotal + newTaxAmount;
        
        await invoice.update({
          subtotal: itemsSum, // Subtotal stays raw sum, discount reduces taxable base
          tax_amount: newTaxAmount,
          grand_total: newGrandTotal,
          amount: newGrandTotal
        }, { transaction: t });
      }

      await t.commit();
      return order;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }
}
