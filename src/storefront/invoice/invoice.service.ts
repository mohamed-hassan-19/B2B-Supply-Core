import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Invoice, Order, Client, OrderItem } from '../../database/models';
import { PdfService } from '../../admin/invoice/pdf.service';

@Injectable()
export class StorefrontInvoiceService {
  constructor(private readonly pdfService: PdfService) {}

  async findAllForClient(clientId: number) {
    return Invoice.findAll({
      include: [
        {
          model: Order,
          where: { client_id: clientId },
          attributes: ['id', 'client_id'], // Don't need to leak full order details if they only need the ID
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async findOneForClient(id: number, clientId: number) {
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Order, where: { client_id: clientId } }]
    });

    if (!invoice || !(invoice as any).Order) {
      throw new NotFoundException(`Invoice not found`);
    }

    const order = (invoice as any).Order;
    const client = await Client.findByPk(order.client_id);
    const items = await OrderItem.findAll({ where: { order_id: order.id } });

    return { invoice, order, client, items };
  }

  async getPdfForClient(id: number, clientId: number) {
    const data = await this.findOneForClient(id, clientId);
    const { invoice, order, client, items } = data;

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
}
