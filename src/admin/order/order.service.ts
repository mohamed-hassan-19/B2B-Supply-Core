import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Order, OrderItem, Product, Client, Invoice, Quote, QuoteItem, OrderActivityLog } from '../../database/models';
import { Op } from 'sequelize';
import { calculateDiscountTotals } from '../../common/utils/discount-calculator.util';

@Injectable()
export class OrderService {
  async recalculateOrder(order: any, items: any[], t: any) {
    const { itemsSumAfterItemDiscounts, orderDiscountAmount, totalAmount, processedItems } = calculateDiscountTotals(order.discount_percentage, items);
    
    order.discount_amount = orderDiscountAmount;
    order.total_amount = totalAmount;
    await order.save({ transaction: t });

    for (const pItem of processedItems) {
      const dbItem = items.find(i => i.id === pItem.id);
      if (dbItem) {
        if (dbItem.discount_amount !== pItem.discount_amount) {
          dbItem.discount_amount = pItem.discount_amount;
        }
        if (dbItem.changed()) {
          await dbItem.save({ transaction: t });
        }
      }
    }

    const invoice = await Invoice.findOne({ where: { order_id: order.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (invoice) {
      const taxRate = Number(invoice.tax_rate) || 0.14;
      const newTaxAmount = totalAmount * taxRate;
      const newGrandTotal = totalAmount + newTaxAmount;
      
      await invoice.update({
        subtotal: itemsSumAfterItemDiscounts,
        tax_amount: newTaxAmount,
        grand_total: newGrandTotal,
        amount: newGrandTotal
      }, { transaction: t });
    }
    return { itemsSumAfterItemDiscounts, totalAmount };
  }

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
        status: 'pending', // draft
        discount_percentage: order.discount_percentage,
        discount_amount: order.discount_amount
      }, { transaction: t });

        // Add all existing items to this quote
        for (const item of items) {
          await QuoteItem.create({
            quote_id: quote.id,
            product_id: item.product_id,
            requested_quantity: item.quantity,
            quoted_price: item.unit_price,
            purchase_unit: item.purchase_unit,
            dozen_size_at_purchase: item.dozen_size_at_purchase,
            discount_percentage: item.discount_percentage,
            discount_amount: item.discount_amount
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

      const old_discount = order.discount_percentage || 0;
      order.discount_percentage = discount_percentage;

      const items = await OrderItem.findAll({ where: { order_id: id }, transaction: t });
      
      await this.recalculateOrder(order, items, t);

      if (actorUser && old_discount !== discount_percentage) {
        await OrderActivityLog.create({
          order_id: order.id,
          action_type: 'discount_changed',
          actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
          description: `Order discount updated from ${old_discount}% to ${discount_percentage}%`
        }, { transaction: t });
      }

      await t.commit();
      return order;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async applyItemDiscount(id: number, itemId: number, discount_percentage: number, actorUser?: any) {
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
      const targetItem = items.find(i => i.id === itemId);
      
      if (!targetItem) {
        throw new NotFoundException(`Order item with ID ${itemId} not found`);
      }

      const old_discount = targetItem.discount_percentage || 0;
      targetItem.discount_percentage = discount_percentage;

      await this.recalculateOrder(order, items, t);

      if (actorUser && old_discount !== discount_percentage) {
        await OrderActivityLog.create({
          order_id: order.id,
          action_type: 'discount_changed',
          actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
          description: `Item '${targetItem.product_name}' discount updated from ${old_discount}% to ${discount_percentage}%`
        }, { transaction: t });
      }

      await t.commit();
      return order;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async cancelItem(id: number, itemId: number, reason: string, actorUser?: any) {
    if (!Product.sequelize) throw new Error('Sequelize instance not found');
    const t = await Product.sequelize.transaction();
    
    try {
      const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (order.status !== 'pending' && order.status !== 'approved') {
        throw new BadRequestException(`Cannot cancel item. Order status must be pending or approved.`);
      }

      const pendingRevision = await Quote.findOne({ 
        where: { related_order_id: id, status: 'sent' }, 
        transaction: t 
      });
      if (pendingRevision) {
        throw new BadRequestException(`Cannot cancel item. Resolve the pending order revision before cancelling an item.`);
      }

      const items = await OrderItem.findAll({ where: { order_id: id }, transaction: t });
      const targetItem = items.find(i => i.id === itemId);
      
      if (!targetItem) {
        throw new NotFoundException(`Order item with ID ${itemId} not found`);
      }
      if (targetItem.is_cancelled) {
        throw new BadRequestException(`Item with ID ${itemId} is already cancelled`);
      }

      targetItem.is_cancelled = true;
      await targetItem.save({ transaction: t });

      if (targetItem.product_id) {
        const product = await Product.findByPk(targetItem.product_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (product) {
          product.stock_level += targetItem.quantity;
          await product.save({ transaction: t });
        }
      }

      const nonCancelledItems = items.filter(i => !i.is_cancelled);
      
      if (nonCancelledItems.length === 0) {
        await t.rollback();
        return this.cancelOrder(id, actorUser);
      }

      await this.recalculateOrder(order, nonCancelledItems, t);

      if (actorUser) {
        await OrderActivityLog.create({
          order_id: order.id,
          action_type: 'item_cancelled',
          actor: `Admin #${actorUser.id} (${actorUser.name || actorUser.email})`,
          description: `Item '${targetItem.product_name}' was cancelled. Reason: ${reason}`
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
