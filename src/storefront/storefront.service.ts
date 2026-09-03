import { Injectable, NotFoundException } from '@nestjs/common';
import { Product, Category } from '../database/models';
import { Op } from 'sequelize';

@Injectable()
export class StorefrontService {
  async getCategories() {
    return Category.findAll({ order: [['name', 'ASC']] });
  }

  async findAll(page: number, limit: number, search?: string, categoryId?: number) {
    const offset = (page - 1) * limit;

    const whereClause: any = { is_active: true };

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }
    
    if (categoryId) {
      whereClause.category_id = categoryId;
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      include: [{ model: Category, attributes: ['id', 'name'] }],
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
      where: { id, is_active: true },
      include: [{ model: Category, attributes: ['id', 'name'] }]
    });

    if (!product) {
      throw new NotFoundException(`Product not found or inactive`);
    }

    return product;
  }
}
