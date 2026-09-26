import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Client, Product, Order, OrderItem } from '../../database/models';
import { CreateOrderDto } from './order.dto';
import { PdfService } from '../../admin/invoice/pdf.service';
import { executeOrderTransaction, CoreOrderItemData } from '../../common/utils/order-core.util';

@Injectable()
export class OrderService {
  constructor(private readonly pdfService: PdfService) {}

  async createOrder(clientId: number, dto: CreateOrderDto) {
    if (!Product.sequelize) {
      throw new Error('Sequelize instance not found');
    }
    const t = await Product.sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!client) {
        throw new NotFoundException('Client not found');
      }
      
      if (client.status !== 'approved') {
        throw new ForbiddenException(`Client account is ${client.status}. Only approved clients can place orders.`);
      }

      // Defense in depth: Mapped explicitly, NEVER accepting unitPrice from public DTO
      const coreItems: CoreOrderItemData[] = dto.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        purchaseUnit: i.purchase_unit || 'single',
        unitPrice: undefined // ALWAYS derived by core!
      }));

      const order = await executeOrderTransaction({
        client,
        items: coreItems,
        paymentMethod: dto.paymentMethod,
        orderStatus: 'pending',
        actor: client.company_name || 'Customer',
        actionType: 'created',
        description: 'Order submitted by customer',
        transaction: t
      });

      await t.commit();
      
      return order;
    } catch (error) {
      try {
        await t.rollback();
      } catch (rollbackError) {}
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
