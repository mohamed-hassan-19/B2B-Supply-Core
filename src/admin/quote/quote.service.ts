import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Quote, QuoteItem, Client, Product } from '../../database/models';

@Injectable()
export class QuoteService {
  async findAll() {
    return Quote.findAll({ order: [['id', 'DESC']] });
  }

  async createQuote(clientId: number, items: { productId: number; quantity: number; quotedPrice: number }[], validUntil?: string) {
    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    if (!Product.sequelize) {
      throw new Error('Sequelize not found');
    }

    const t = await Product.sequelize.transaction();

    try {
      const quote = await Quote.create({
        client_id: client.id,
        status: 'pending', // pending = draft
        valid_until: validUntil || null
      }, { transaction: t });

      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        if (!product || !product.is_active) {
          throw new BadRequestException(`Active product with ID ${item.productId} not found`);
        }

        await QuoteItem.create({
          quote_id: quote.id,
          product_id: product.id,
          requested_quantity: item.quantity,
          quoted_price: item.quotedPrice
        }, { transaction: t });
      }

      await t.commit();
      return quote;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async sendQuote(id: number) {
    const quote = await Quote.findByPk(id);
    if (!quote) throw new NotFoundException(`Quote ${id} not found`);
    if (quote.status !== 'pending') throw new BadRequestException(`Quote is already ${quote.status}`);
    
    return quote.update({ status: 'sent' });
  }
}
