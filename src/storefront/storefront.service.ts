import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '../database/models';
import { Op } from 'sequelize';

@Injectable()
export class StorefrontService {
  async findAll(page: number, limit: number, search?: string, category?: string) {
    const offset = (page - 1) * limit;

    const whereClause: any = { is_active: true };

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }
    
    if (category) {
      whereClause.category = category;
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['id', 'DESC']],
    });

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  async findOne(id: number) {
    const product = await Product.findOne({
      where: { id, is_active: true }
    });

    if (!product) {
      throw new NotFoundException(`Product not found or inactive`);
    }

    return product;
  }
}
