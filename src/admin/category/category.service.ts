import { Injectable, ConflictException } from '@nestjs/common';
import { Category } from '../../database/models';
import { CreateCategoryDto } from './category.dto';

@Injectable()
export class CategoryService {
  async findAll(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { is_active: true };
    return Category.findAll({
      where,
      order: [['name', 'ASC']]
    });
  }

  async activate(id: number) {
    const cat = await Category.findByPk(id);
    if (!cat) throw new Error('Category not found');
    return cat.update({ is_active: true });
  }

  async deactivate(id: number) {
    const cat = await Category.findByPk(id);
    if (!cat) throw new Error('Category not found');
    return cat.update({ is_active: false });
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await Category.findOne({ where: { name: createCategoryDto.name } });
    if (existing) {
      throw new ConflictException(`Category "${createCategoryDto.name}" already exists`);
    }
    return Category.create({ name: createCategoryDto.name });
  }
}
