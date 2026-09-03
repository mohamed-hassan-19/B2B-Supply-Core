import { Injectable, ConflictException } from '@nestjs/common';
import { Category } from '../../database/models';
import { CreateCategoryDto } from './category.dto';

@Injectable()
export class CategoryService {
  async findAll() {
    return Category.findAll({
      order: [['name', 'ASC']]
    });
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await Category.findOne({ where: { name: createCategoryDto.name } });
    if (existing) {
      throw new ConflictException(`Category "${createCategoryDto.name}" already exists`);
    }
    return Category.create({ name: createCategoryDto.name });
  }
}
