import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Quote, QuoteItem, Order, OrderItem, Product, Client, Invoice, InvoiceSequence, OrderActivityLog } from '../../database/models';
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

      // 2. Fetch Existing Order (if revision)
      let existingOrder: any = null;
      const oldOrderItemsMap = new Map<number, number>();
      
      if (quote.related_order_id) {
        existingOrder = await Order.findByPk(quote.related_order_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!existingOrder || (existingOrder.status !== 'pending' && existingOrder.status !== 'approved')) {
          throw new BadRequestException('Cannot revise order - not found or invalid status');
        }
        const oldItems = await OrderItem.findAll({ where: { order_id: existingOrder.id }, transaction: t });
        for (const oi of oldItems) {
          if (oi.product_id) oldOrderItemsMap.set(oi.product_id, oi.quantity);
        }
      }

      // 3. Process Items and Calculate Total
      let totalAmount = 0;
      const orderItemsData: any[] = [];
      const quoteItems = await QuoteItem.findAll({ where: { quote_id: quote.id }, transaction: t });

      const productIds = new Set<number>();
      quoteItems.forEach(qi => { if (qi.product_id) productIds.add(qi.product_id); });
      for (const pid of oldOrderItemsMap.keys()) {
        productIds.add(pid);
      }
      const pidArr = Array.from(productIds).sort((a, b) => a - b);

      const products = await Product.findAll({
        where: { id: pidArr },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      const productMap = new Map<number, Product>();
      products.forEach(p => productMap.set(p.id, p));

      // Restore old stock in memory first
      for (const [pid, oldQty] of oldOrderItemsMap.entries()) {
        const p = productMap.get(pid);
        if (p) p.stock_level += oldQty;
      }

      // Process new requirements
      for (const qi of quoteItems) {
        if (!qi.product_id) continue;
        const product = productMap.get(qi.product_id);
        if (!product || !product.is_active) {
          throw new BadRequestException(`Product for Quote Item is unavailable`);
        }
        if (product.stock_level < qi.requested_quantity) {
          throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
        }

        const itemTotal = Number(qi.quoted_price) * qi.requested_quantity;
        totalAmount += itemTotal;
        orderItemsData.push({
          product_id: product.id,
          product_name: product.name,
          quantity: qi.requested_quantity,
          unit_price: qi.quoted_price,
          total_price: itemTotal
        });

        // Deduct new stock
        product.stock_level -= qi.requested_quantity;
      }

      // Save stock updates
      for (const p of productMap.values()) {
        await p.save({ transaction: t });
      }

      // Apply quote discount
      let discountAmount = 0;
      let discountPercentage = quote.discount_percentage;
      
      // Fallback to existing order discount only if quote has no discount specified
      if (discountPercentage === undefined || discountPercentage === null) {
        discountPercentage = existingOrder?.discount_percentage || null;
      }
      
      if (discountPercentage) {
        discountAmount = Math.round((totalAmount * discountPercentage / 100) * 100) / 100;
      }
      
      const discountedTotal = totalAmount - discountAmount;

      // 4. Credit Check if Credit
      if (paymentMethod === 'Credit') {
        let shouldCheckCredit = true;
        if (existingOrder && discountedTotal <= Number(existingOrder.total_amount)) {
          shouldCheckCredit = false;
        }

        if (shouldCheckCredit) {
          if (!client.credit_limit || client.credit_limit <= 0) {
            throw new BadRequestException('Client has no credit limit.');
          }

          const unpaidInvoices = await Invoice.findAll({
            where: { payment_status: { [Op.in]: ['pending', 'overdue'] } },
            include: [{ model: Order, where: { client_id: client.id }, attributes: [] }],
            transaction: t
          });
          
          let unpaidInvoiceTotal = 0;
          for (const inv of unpaidInvoices) {
            if (existingOrder && inv.order_id === existingOrder.id) continue; // Exclude the invoice we're replacing
            unpaidInvoiceTotal += Number(inv.grand_total || inv.amount);
          }

          const totalExposure = unpaidInvoiceTotal + discountedTotal;
          if (totalExposure > client.credit_limit) {
            throw new BadRequestException(`Credit limit exceeded by quote acceptance. Total exposure would be EGP ${totalExposure}`);
          }
        }
      }

      let order, invoice;

      if (existingOrder) {
        // 5a. Modify existing order
        order = existingOrder;
        order.total_amount = discountedTotal;
        order.discount_amount = discountAmount;
        order.discount_percentage = discountPercentage;
        order.payment_method = paymentMethod;
        await order.save({ transaction: t });

        await OrderItem.destroy({ where: { order_id: order.id }, transaction: t });
        for (const itemData of orderItemsData) {
          await OrderItem.create({
            order_id: order.id,
            ...itemData
          }, { transaction: t });
        }

        invoice = await Invoice.findOne({ where: { order_id: order.id }, transaction: t, lock: t.LOCK.UPDATE });
        if (invoice) {
          const taxRate = 0.14;
          const subtotal = discountedTotal;
          const taxAmount = subtotal * taxRate;
          const grandTotal = subtotal + taxAmount;

          invoice.amount = grandTotal;
          invoice.subtotal = subtotal;
          invoice.tax_amount = taxAmount;
          invoice.grand_total = grandTotal;
          invoice.payment_method = paymentMethod;
          // updatedAt will automatically be bumped
          await invoice.save({ transaction: t });
        }
      } else {
        // 5b. Create new order
        order = await Order.create({
          client_id: client.id,
          status: 'pending',
          payment_method: paymentMethod,
          total_amount: discountedTotal,
          discount_amount: discountAmount,
          discount_percentage: discountPercentage
        }, { transaction: t });

        for (const itemData of orderItemsData) {
          await OrderItem.create({
            order_id: order.id,
            ...itemData
          }, { transaction: t });
        }

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

        invoice = await Invoice.create({
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
      }

      // 6. Update Quote
      await quote.update({ status: 'accepted', order_id: order.id }, { transaction: t });

      if (quote.related_order_id) {
        await OrderActivityLog.create({
          order_id: quote.related_order_id,
          action_type: 'revision_accepted',
          actor: 'Customer',
          description: `Revision RFQ-${quote.id} accepted by customer`
        }, { transaction: t });
      }

      await t.commit();

      // Removed automatic PDF generation to save server space

      return order;
    } catch (error) {
      try {
        await t.rollback();
      } catch (rollbackError) {}
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

    await quote.update({ status: 'rejected' });
    if (quote.related_order_id) {
      await OrderActivityLog.create({
        order_id: quote.related_order_id,
        action_type: 'revision_rejected',
        actor: 'Customer',
        description: `Revision RFQ-${quote.id} rejected by customer`
      });
    }
    return quote;
  }
}
