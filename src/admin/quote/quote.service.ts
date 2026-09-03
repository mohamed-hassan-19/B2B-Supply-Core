import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Quote, QuoteItem, Client, Product } from '../../database/models';
import { Op } from 'sequelize';

@Injectable()
export class QuoteService {
  async findAll(options: { start_date?: string, end_date?: string, client_id?: number,  quote_type?: string,page?: number, limit?: number, export?: string | boolean } = {}) {
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

    if (options.client_id) where.client_id = options.client_id;
    
    if (options.quote_type) where.quote_type = options.quote_type;

    const queryOptions: any = { where, order: [['createdAt', 'DESC']] };
    
    // Add specific includes if needed based on entity
    
    queryOptions.include = [{ model: require('../../database/models').Client, attributes: ['company_name', 'is_priority'] }];
    
    
    

    if (options.export && (options.export === 'true' || options.export === true)) {
      const items = await Quote.findAll(queryOptions);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    const { count, rows } = await Quote.findAndCountAll(queryOptions);

    return {
      items: rows,
      total: count,
      page,
      limit
    };
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
