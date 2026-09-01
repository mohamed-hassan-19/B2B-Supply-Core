import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Quote, QuoteItem, Order, OrderItem, Product, Client, Invoice, InvoiceSequence } from '../../database/models';
import { Op } from 'sequelize';
import { PdfService } from '../../admin/invoice/pdf.service';

@Injectable()
export class QuoteService {
  constructor(private readonly pdfService: PdfService) {}

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

      if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
        quote.status = 'expired';
        await quote.save({ transaction: t });
        await t.commit();
        throw new BadRequestException('This quote has expired.');
      }

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
        const unpaidInvoiceTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || inv.amount), 0);

        const totalExposure = unpaidInvoiceTotal + totalAmount;
        if (totalExposure > client.credit_limit) {
          throw new BadRequestException(`Credit limit exceeded by quote acceptance. Total exposure would be £${totalExposure}`);
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

      // 6. Create the Invoice automatically
      const currentYear = new Date().getFullYear();
      await InvoiceSequence.findOrCreate({
        where: { year: currentYear },
        defaults: { last_value: 0 },
        transaction: t
      });
      const sequence = await InvoiceSequence.findOne({
        where: { year: currentYear },
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      
      const nextVal = sequence!.last_value + 1;
      sequence!.last_value = nextVal;
      await sequence!.save({ transaction: t });

      const invoiceNumber = `INV-${currentYear}-${String(nextVal).padStart(4, '0')}`;
      const taxRate = 0.14;
      const subtotal = totalAmount;
      const taxAmount = subtotal * taxRate;
      const grandTotal = subtotal + taxAmount;

      const invoice = await Invoice.create({
        invoice_number: invoiceNumber,
        order_id: order.id,
        amount: grandTotal,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        currency: 'EGP',
        payment_method: paymentMethod,
        sales_order_reference: `SO-${order.id}`,
        customer_tax_id: client.tax_registration || null,
        payment_status: 'pending'
      }, { transaction: t });

      await t.commit();

      // 7. Non-blocking PDF generation
      try {
        const pdfUrl = await this.pdfService.generateInvoicePdf(invoice, client, orderItemsData);
        invoice.pdf_url = pdfUrl;
        invoice.pdf_generated_at = new Date();
        await invoice.save();
      } catch (err) {
        console.error('Failed to generate PDF for accepted quote order', order.id, err);
      }

      return order;
    } catch (error) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        // Ignore rollback error if already committed/rolled back
      }
      throw error;
    }
  }

  async rejectQuote(clientId: number, quoteId: number) {
    const quote = await Quote.findOne({ where: { id: quoteId, client_id: clientId } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'sent') throw new BadRequestException(`Cannot reject quote in '${quote.status}' status`);

    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      return quote.update({ status: 'expired' });
    }

    return quote.update({ status: 'rejected' });
  }
}
