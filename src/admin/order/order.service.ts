import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Order, OrderItem, Product, Client } from '../../database/models';

@Injectable()
export class OrderService {
  async findAll(status?: string, client_id?: number) {
    const where: any = {};
    if (status) where.status = status;
    if (client_id) where.client_id = client_id;

    return Order.findAll({
      where,
      order: [['id', 'DESC']]
    });
  }

  async findOne(id: number) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    const items = await OrderItem.findAll({ where: { order_id: id } });
    const client = await Client.findByPk(order.client_id, { attributes: ['id', 'company_name', 'email'] });
    
    return {
      order,
      client,
      items
    };
  }

  async updateStatus(id: number, allowedCurrentStatuses: string[], nextStatus: string) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (!allowedCurrentStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot change status to '${nextStatus}'. Order is currently '${order.status}' (requires ${allowedCurrentStatuses.join(' or ')}).`
      );
    }

    return order.update({ status: nextStatus });
  }

  async cancelOrder(id: number) {
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

      await order.update({ status: 'cancelled' }, { transaction: t });

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
