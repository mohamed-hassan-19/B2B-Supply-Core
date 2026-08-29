import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Sequelize, Op } from 'sequelize';
import { Client, Product, Order, OrderItem, Invoice } from '../../database/models';
import { CreateOrderDto } from './order.dto';

@Injectable()
export class OrderService {
  async createOrder(clientId: number, dto: CreateOrderDto) {
    if (!Product.sequelize) {
      throw new Error('Sequelize instance not found');
    }
    const t = await Product.sequelize.transaction();

    try {
      // 1. Validate Client Status and Payment Eligibility
      const client = await Client.findByPk(clientId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!client) {
        throw new NotFoundException('Client not found');
      }
      
      if (client.status !== 'approved') {
        throw new ForbiddenException(`Client account is ${client.status}. Only approved clients can place orders.`);
      }



      let totalAmount = 0;
      const orderItemsData: any[] = [];

      // 2. Process Items and Lock Rows
      // To avoid deadlocks, we should order the product IDs before locking them
      const productIds = dto.items.map(i => i.productId).sort((a, b) => a - b);
      
      // Fetch all required products with an exclusive lock
      const products = await Product.findAll({
        where: { id: productIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const productMap = new Map<number, Product>();
      products.forEach(p => productMap.set(p.id, p));

      // 3. Verify Stock and Build Order Items
      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        
        if (!product) {
          throw new BadRequestException(`Product with ID ${item.productId} does not exist`);
        }
        
        if (!product.is_active) {
          throw new BadRequestException(`Product ${product.name} is no longer active`);
        }

        if (product.stock_level < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}. Requested: ${item.quantity}, Available: ${product.stock_level}`);
        }

        totalAmount += Number(product.price) * item.quantity;

        orderItemsData.push({
          product_id: product.id, // we might not even have product_id FK strictly since we snapshot name, but let's keep it if FK exists
          product_name: product.name,
          quantity: item.quantity,
          unit_price: product.price,
        });

        // Decrement stock (will be saved when transaction commits)
        product.stock_level -= item.quantity;
        await product.save({ transaction: t });
      }

      // 3.5. Comprehensive Credit Limit Check
      if (dto.paymentMethod === 'Credit') {
        if (!client.credit_limit || client.credit_limit <= 0) {
          throw new BadRequestException('Client is not eligible for Credit payment method. No credit limit assigned.');
        }

        // Sum unpaid invoices for this client
        // Invoices are tied to orders, but we can query by order's client_id using an include, or more easily:
        // Wait, Invoice model only has order_id. We must join Order to filter by client_id.
        const unpaidInvoices = await Invoice.findAll({
          where: { payment_status: { [Op.ne]: 'paid' } },
          include: [{
            model: Order,
            where: { client_id: client.id },
            attributes: []
          }],
          transaction: t
        });
        const unpaidInvoiceTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        // Sum uninvoiced orders (Credit method, not delivered, not cancelled)
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
          throw new BadRequestException(
            `Credit limit exceeded. Limit: $${client.credit_limit}, ` +
            `Unpaid Invoices: $${unpaidInvoiceTotal}, ` +
            `Active Orders: $${activeOrdersTotal}, ` +
            `New Order: $${totalAmount}. ` +
            `Total Exposure: $${totalExposure}`
          );
        }
      }

      // 4. Create the Order
      const order = await Order.create({
        client_id: client.id,
        status: 'pending',
        payment_method: dto.paymentMethod,
        total_amount: totalAmount
      }, { transaction: t });

      // 5. Create the Order Items
      for (const itemData of orderItemsData) {
        await OrderItem.create({
          order_id: order.id,
          ...itemData
        }, { transaction: t });
      }

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async findAllForClient(clientId: number) {
    return Order.findAll({
      where: { client_id: clientId },
      include: [
        { model: OrderItem },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}
