import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Quote, QuoteItem, Client, Product, Order, OrderActivityLog } from '../../database/models';
import { PdfService } from '../../admin/invoice/pdf.service';
import { executeOrderTransaction, CoreOrderItemData } from '../../common/utils/order-core.util';

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

      let existingOrder: any = null;
      if (quote.related_order_id) {
        existingOrder = await Order.findByPk(quote.related_order_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!existingOrder || (existingOrder.status !== 'pending' && existingOrder.status !== 'approved')) {
          throw new BadRequestException('Cannot revise order - not found or invalid status');
        }
      }

      const quoteItems = await QuoteItem.findAll({ where: { quote_id: quote.id }, transaction: t });
      
      const coreItems: CoreOrderItemData[] = quoteItems.map(qi => ({
        productId: qi.product_id || undefined,
        customItemName: qi.custom_item_name || undefined,
        customItemDescription: qi.custom_item_description || undefined,
        quantity: qi.requested_quantity,
        unitPrice: qi.quoted_price || undefined, // Quotes provide their own negotiated prices
        purchaseUnit: qi.purchase_unit || 'single',
        dozenSizeAtPurchase: qi.dozen_size_at_purchase || null,
        discountPercentage: qi.discount_percentage,
        isCancelled: qi.is_cancelled
      }));

      let discountPercentage = quote.discount_percentage;
      if (discountPercentage === undefined || discountPercentage === null) {
        discountPercentage = existingOrder?.discount_percentage || null;
      }

      const order = await executeOrderTransaction({
        client,
        items: coreItems,
        paymentMethod,
        discountPercentage,
        existingOrder,
        orderStatus: 'pending',
        actor: 'Customer',
        actionType: 'quote_accepted',
        description: `Quote RFQ-${quote.id} accepted by customer`,
        transaction: t
      });

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