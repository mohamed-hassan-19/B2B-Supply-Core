import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Invoice, Order, Client, OrderItem, Product } from '../../database/models';
import { Op } from 'sequelize';
import { PdfService } from './pdf.service';

@Injectable()
export class InvoiceService {
  constructor(private readonly pdfService: PdfService) {}

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

    
    // Invoice has order_id which links to client_id
    
    if (options.status) where.payment_status = options.status;
    

    const queryOptions: any = { where, order: [['createdAt', 'DESC']] };
    
    // Add specific includes if needed based on entity
    
    
    
    
    if (options.client_id) {
      queryOptions.include = [
        { model: require('../../database/models').Order, where: { client_id: options.client_id }, include: [require('../../database/models').Client] }
      ];
    } else {
      queryOptions.include = [
        { model: require('../../database/models').Order, include: [require('../../database/models').Client] }
      ];
    }
    
    

    if (options.export && (options.export === 'true' || options.export === true)) {
      const items = await Invoice.findAll(queryOptions);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    const { count, rows } = await Invoice.findAndCountAll(queryOptions);

    return {
      items: rows,
      total: count,
      page,
      limit
    };
  }

  async findOne(id: number) {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);

    const order = await Order.findByPk(invoice.order_id);
    const client = order ? await Client.findByPk(order.client_id) : null;
    const items = order ? await OrderItem.findAll({ where: { order_id: order.id } }) : [];

    return { invoice, order, client, items };
  }

  async generateInvoice(orderId: number) {
    throw new BadRequestException('Manual invoice generation is deprecated. Invoices are now created automatically at checkout.');
  }

  async getPdf(id: number): Promise<Buffer> {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const order = await Order.findByPk(invoice.order_id);
    if (!order) throw new NotFoundException('Order not found');

    const client = await Client.findByPk(order.client_id);
    if (!client) throw new NotFoundException('Client not found');

    const items = await OrderItem.findAll({ where: { order_id: order.id } });
    
    // Fetch product names for the items
    const itemsData = await Promise.all(items.map(async (item: any) => {
      const product = await Product.findByPk(item.product_id);
      return {
        ...item.toJSON(),
        product_name: product ? product.name : `Product #${item.product_id}`
      };
    }));

    try {
      const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice, client, itemsData, order);
      return pdfBuffer;
    } catch (err) {
      console.error('PDF generation error:', err);
      throw new InternalServerErrorException('Failed to generate PDF');
    }
  }

  async payInvoice(id: number) {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.payment_status === 'paid') {
      throw new BadRequestException(`Invoice is already paid`);
    }
    if (invoice.payment_status === 'void') {
      throw new BadRequestException(`Cannot pay a voided invoice`);
    }

    return invoice.update({ payment_status: 'paid' });
  }
}
