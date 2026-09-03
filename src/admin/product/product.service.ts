import { Injectable, NotFoundException } from '@nestjs/common';
import { Product, Category } from '../../database/models';
import { Op } from 'sequelize';
import { CreateProductDto, UpdateProductDto, UpdateStockDto } from './product.dto';

@Injectable()
export class ProductService {
  async create(createProductDto: CreateProductDto) {
    if (createProductDto.low_stock_threshold === undefined || createProductDto.low_stock_threshold === null) {
      createProductDto.low_stock_threshold = Math.floor((createProductDto.stock_level || 0) * 0.2);
    }
    return Product.create(createProductDto as any);
  }

  async findAll(options: { start_date?: string, end_date?: string, client_id?: number, page?: number, limit?: number, export?: string | boolean } = {}) {
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

    
    
    

    const queryOptions: any = { 
      where, 
      order: [['createdAt', 'DESC']],
      include: [{ model: Category, attributes: ['id', 'name'] }]
    };
    
    
    
    
    

    if (options.export && (options.export === 'true' || options.export === true)) {
      const items = await Product.findAll(queryOptions);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    const { count, rows } = await Product.findAndCountAll(queryOptions);

    return {
      items: rows,
      total: count,
      page,
      limit
    };
  }

  async findOne(id: number) {
    const product = await Product.findByPk(id, {
      include: [{ model: Category, attributes: ['id', 'name'] }]
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);
    return product.update(updateProductDto);
  }

  async updateStock(id: number, updateStockDto: UpdateStockDto) {
    const product = await this.findOne(id);
    const updates: any = { stock_level: updateStockDto.stock_level };
    
    // If setting stock for the first time on a product that has no threshold, calculate it
    if (product.stock_level === 0 && updateStockDto.stock_level > 0 && product.low_stock_threshold === 0) {
      updates.low_stock_threshold = Math.floor(updateStockDto.stock_level * 0.2);
    }
    
    return product.update(updates);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    return product.update({ is_active: false });
  }
}
