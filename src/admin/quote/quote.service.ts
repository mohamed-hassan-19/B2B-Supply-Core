import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Quote, QuoteItem, Product, Client, OrderActivityLog } from '../../database/models';
import { Op } from 'sequelize';
import { CreateQuoteDto, UpdateQuoteDto } from './quote.dto';
import { calculateDiscountTotals } from '../../common/utils/discount-calculator.util';

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

  async createQuote(clientId: number, items: { productId: number; quantity: number; quotedPrice: number, purchase_unit?: 'single' | 'dozen', discount_percentage?: number }[], validUntil?: string, discount_percentage?: number) {
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
        valid_until: validUntil || null,
        discount_percentage: discount_percentage || null
      }, { transaction: t });

      const quoteItemsData: any[] = [];

      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        if (!product || !product.is_active) {
          throw new BadRequestException(`Active product with ID ${item.productId} not found`);
        }

        if (item.purchase_unit === 'dozen') {
          if (!product.dozen_quantity) {
            throw new BadRequestException(`Product ${product.name} does not have a dozen size configured`);
          }
          if (item.quantity % product.dozen_quantity !== 0) {
            throw new BadRequestException(`Requested quantity ${item.quantity} for dozen purchase of ${product.name} is not an exact multiple of its dozen size (${product.dozen_quantity})`);
          }
        }

        quoteItemsData.push({
          quote_id: quote.id,
          product_id: product.id,
          requested_quantity: item.quantity,
          quoted_price: item.quotedPrice,
          purchase_unit: item.purchase_unit || 'single',
          dozen_size_at_purchase: item.purchase_unit === 'dozen' ? product.dozen_quantity : null,
          discount_percentage: item.discount_percentage || null
        });
      }

      const { orderDiscountAmount, processedItems } = calculateDiscountTotals(discount_percentage, quoteItemsData);

      for (const itemData of processedItems) {
        await QuoteItem.create(itemData, { transaction: t });
      }

      if (orderDiscountAmount) {
        quote.discount_amount = orderDiscountAmount;
        await quote.save({ transaction: t });
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
      let itemsForCalculation: any[] = [];

      if (updateQuoteDto.items) {
        await QuoteItem.destroy({ where: { quote_id: id }, transaction: t });
        
        for (const item of updateQuoteDto.items) {
          const product = await Product.findByPk(item.productId, { transaction: t });
          if (!product || !product.is_active) {
            throw new BadRequestException(`Product ${item.productId} is unavailable`);
          }

          if (item.purchase_unit === 'dozen') {
            if (!product.dozen_quantity) {
              throw new BadRequestException(`Product ${product.name} does not have a dozen size configured`);
            }
            if (item.quantity % product.dozen_quantity !== 0) {
              throw new BadRequestException(`Requested quantity ${item.quantity} for dozen purchase of ${product.name} is not an exact multiple of its dozen size (${product.dozen_quantity})`);
            }
          }

          itemsForCalculation.push({
            quote_id: quote.id,
            product_id: item.productId,
            requested_quantity: item.quantity,
            quoted_price: item.quotedPrice || product.price,
            purchase_unit: item.purchase_unit || 'single',
            dozen_size_at_purchase: item.purchase_unit === 'dozen' ? product.dozen_quantity : null,
            discount_percentage: item.discount_percentage || null
          });
        }
      } else {
        // Keep existing items if not provided
        const existingItems = await QuoteItem.findAll({ where: { quote_id: id }, transaction: t });
        itemsForCalculation = existingItems.map(ei => ei.get({ plain: true }));
      }

      const { orderDiscountAmount, processedItems } = calculateDiscountTotals(quote.discount_percentage, itemsForCalculation);

      // Save items
      if (updateQuoteDto.items) {
        for (const itemData of processedItems) {
          await QuoteItem.create(itemData, { transaction: t });
        }
      } else {
        // If only discount changed, update existing items
        const dbItems = await QuoteItem.findAll({ where: { quote_id: id }, transaction: t });
        for (const pItem of processedItems) {
          const dbItem = dbItems.find(i => i.id === pItem.id);
          if (dbItem && dbItem.discount_amount !== pItem.discount_amount) {
            dbItem.discount_amount = pItem.discount_amount;
            await dbItem.save({ transaction: t });
          }
        }
      }

      quote.discount_amount = orderDiscountAmount || 0;

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
