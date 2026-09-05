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

  async updateQuote(id: number, updateQuoteDto: any) {
    if (!Product.sequelize) throw new Error('Sequelize not found');
    const t = await Product.sequelize.transaction();

    try {
      const quote = await Quote.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!quote) throw new NotFoundException(`Quote ${id} not found`);
      if (quote.status !== 'pending' && quote.status !== 'sent') {
        throw new BadRequestException(`Cannot update quote in '${quote.status}' status`);
      }

      if (updateQuoteDto.valid_until !== undefined) {
        quote.valid_until = updateQuoteDto.valid_until ? new Date(updateQuoteDto.valid_until) : null;
      }
      
      if (updateQuoteDto.discount_percentage !== undefined) {
        quote.discount_percentage = updateQuoteDto.discount_percentage;
      }

      // If items are provided, replace existing items
      if (updateQuoteDto.items) {
        await QuoteItem.destroy({ where: { quote_id: id }, transaction: t });
        
        let itemsSum = 0;
        for (const item of updateQuoteDto.items) {
          const product = await Product.findByPk(item.productId, { transaction: t });
          if (!product || !product.is_active) {
            throw new BadRequestException(`Product ${item.productId} is unavailable`);
          }
          await QuoteItem.create({
            quote_id: quote.id,
            product_id: item.productId,
            requested_quantity: item.quantity,
            quoted_price: item.quotedPrice || product.price,
          }, { transaction: t });
          itemsSum += (Number(item.quotedPrice || product.price) * item.quantity);
        }

        // Recalculate discount_amount if discount_percentage exists
        if (quote.discount_percentage !== null && quote.discount_percentage !== undefined) {
          quote.discount_amount = Math.round((itemsSum * (quote.discount_percentage as number) / 100) * 100) / 100;
        } else {
          quote.discount_amount = 0;
        }
      } else {
        // If items are not updated, but discount_percentage is, we need to recalculate discount_amount
        if (updateQuoteDto.discount_percentage !== undefined) {
          const items = await QuoteItem.findAll({ where: { quote_id: id }, transaction: t });
          const itemsSum = items.reduce((sum, item) => sum + (Number(item.quoted_price) * item.requested_quantity), 0);
          quote.discount_amount = (quote.discount_percentage !== null && quote.discount_percentage !== undefined)
            ? Math.round((itemsSum * (quote.discount_percentage as number) / 100) * 100) / 100 
            : 0;
        }
      }

      await quote.save({ transaction: t });
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
