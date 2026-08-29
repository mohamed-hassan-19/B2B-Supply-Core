import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Invoice, Order, Client } from '../../database/models';

@Injectable()
export class InvoiceService {
  async findAll() {
    return Invoice.findAll({
      order: [['id', 'DESC']]
    });
  }

  async generateInvoice(orderId: number) {
    const order = await Order.findByPk(orderId, {
      include: [Client]
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== 'delivered') {
      throw new BadRequestException(`Cannot generate invoice for order in '${order.status}' status. Must be 'delivered'.`);
    }

    const existingInvoice = await Invoice.findOne({ where: { order_id: orderId } });
    if (existingInvoice) {
      throw new BadRequestException(`An invoice already exists for Order ${orderId}`);
    }

    const client = await Client.findByPk(order.client_id);
    let dueDate = undefined;

    if (client && client.credit_terms) {
      const date = new Date();
      date.setDate(date.getDate() + client.credit_terms);
      dueDate = date;
    } else {
      // If client is missing or has no credit terms, default to today
      dueDate = new Date();
    }

    const invoice = await Invoice.create({
      order_id: order.id,
      amount: order.total_amount,
      payment_status: 'pending',
      due_date: dueDate
    });

    return invoice;
  }

  async payInvoice(id: number) {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.payment_status === 'paid') {
      throw new BadRequestException(`Invoice is already paid`);
    }

    return invoice.update({ payment_status: 'paid' });
  }
}
