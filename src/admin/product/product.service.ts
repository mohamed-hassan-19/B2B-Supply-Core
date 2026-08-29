import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '../../database/models';
import { CreateProductDto, UpdateProductDto, UpdateStockDto } from './product.dto';

@Injectable()
export class ProductService {
  async create(createProductDto: CreateProductDto) {
    return Product.create(createProductDto as any);
  }

  async findAll() {
    return Product.findAll(); // Admins see all products, including inactive
  }

  async findOne(id: number) {
    const product = await Product.findByPk(id);
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
    return product.update({ stock_level: updateStockDto.stock_level });
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    return product.update({ is_active: false });
  }
}
