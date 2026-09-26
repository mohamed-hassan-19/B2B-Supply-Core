import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePurchaseDto } from './purchase.dto';
import { Purchase, Product, Category, AdminUser } from '../../database/models';

@Injectable()
export class PurchaseService {
  
  async createPurchase(userId: number, dto: CreatePurchaseDto) {
    const transaction = await Product.sequelize!.transaction();
    try {
      let productId = dto.productId;

      if (productId) {
        // Existing Product
        const product = await Product.findByPk(productId, { lock: transaction.LOCK.UPDATE, transaction });
        if (!product) {
          throw new NotFoundException(`Product with ID ${productId} not found`);
        }
        product.stock_level += dto.quantityPurchased;
        await product.save({ transaction });
      } else {
        // New Draft Product
        if (!dto.categoryId || !dto.productName) {
          throw new BadRequestException('categoryId and productName are required to draft a new product');
        }
        
        const category = await Category.findByPk(dto.categoryId, { transaction });
        if (!category) {
          throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
        }

        const newProduct = await Product.create({
          name: dto.productName,
          category_id: dto.categoryId,
          stock_level: dto.quantityPurchased,
          is_active: false,
          // Explicitly null fields that must be filled by content later
          price: null,
        }, { transaction });
        
        productId = newProduct.id;
      }

      const totalCost = Number(dto.quantityPurchased) * Number(dto.unitCost);

      const purchase = await Purchase.create({
        product_id: productId,
        supplier_name: dto.supplierName || null,
        quantity_purchased: dto.quantityPurchased,
        unit_cost: dto.unitCost,
        total_cost: totalCost,
        purchase_date: new Date(dto.purchaseDate),
        created_by: userId,
        notes: dto.notes || null
      }, { transaction });

      await transaction.commit();
      return purchase;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findAll() {
    return Purchase.findAll({
      order: [['purchase_date', 'DESC'], ['createdAt', 'DESC']],
      include: [
        { model: Product, attributes: ['id', 'name'] },
        { model: AdminUser, attributes: ['id', 'name', 'email'] }
      ]
    });
  }
}
