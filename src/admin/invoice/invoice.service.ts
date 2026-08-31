import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Invoice, Order, Client, OrderItem } from '../../database/models';
import { PdfService } from './pdf.service';

@Injectable()
export class InvoiceService {
  constructor(private readonly pdfService: PdfService) {}

  async findAll() {
    return Invoice.findAll({
      order: [['id', 'DESC']]
    });
  }

  async generateInvoice(orderId: number) {
    throw new BadRequestException('Manual invoice generation is deprecated. Invoices are now created automatically at checkout.');
  }

  async getPdf(id: number) {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    // Determine if regeneration is needed
    // Regenerate if pdf_url is null, or if pdf_generated_at is null, or if the invoice was updated after the PDF was generated.
    // We add a small buffer (e.g. 1 second) in case they were updated in the same transaction but slightly apart in timestamp.
    let needsRegeneration = false;
    if (!invoice.pdf_url || !invoice.pdf_generated_at) {
      needsRegeneration = true;
    } else {
      const generatedAt = new Date(invoice.pdf_generated_at).getTime();
      const updatedAt = new Date(invoice.updatedAt).getTime();
      if (updatedAt > generatedAt + 1000) {
        needsRegeneration = true;
      }
    }

    if (!needsRegeneration) {
      return { success: true, pdfUrl: invoice.pdf_url, generated: false };
    }

    const order = await Order.findByPk(invoice.order_id);
    if (!order) throw new NotFoundException('Order not found');

    const client = await Client.findByPk(order.client_id);
    if (!client) throw new NotFoundException('Client not found');

    const items = await OrderItem.findAll({ where: { order_id: order.id } });

    // Build plain objects for pdf generation matching what it expects
    const itemsData = items.map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    try {
      const pdfUrl = await this.pdfService.generateInvoicePdf(invoice, client, itemsData);
      await invoice.update({ pdf_url: pdfUrl, pdf_generated_at: new Date() });
      return { success: true, pdfUrl, generated: true };
    } catch (err) {
      console.error('Failed to regenerate PDF', err);
      throw new BadRequestException('Failed to generate PDF document');
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
