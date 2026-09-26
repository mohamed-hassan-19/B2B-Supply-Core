import { Model, DataTypes } from 'sequelize';

export class QuoteItem extends Model {
  declare id: number;
  declare quote_id: number;
  declare product_id?: number | null;
  declare custom_item_name?: string | null;
  declare custom_item_description?: string | null;
  declare is_cancelled?: boolean;
  declare requested_quantity: number;
  declare quoted_price?: number | null;
  declare purchase_unit: 'single' | 'dozen';
  declare dozen_size_at_purchase?: number;
  declare discount_percentage?: number | null;
  declare discount_amount?: number | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initQuoteItem = (sequelize: any) => {
  QuoteItem.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      quote_id: { type: DataTypes.INTEGER, allowNull: false },
      product_id: { type: DataTypes.INTEGER, allowNull: true },
      custom_item_name: { type: DataTypes.STRING, allowNull: true },
      custom_item_description: { type: DataTypes.TEXT, allowNull: true },
      is_cancelled: { type: DataTypes.BOOLEAN, defaultValue: false },
      requested_quantity: { type: DataTypes.INTEGER, allowNull: false },
      quoted_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      purchase_unit: { type: DataTypes.ENUM('single', 'dozen'), allowNull: false, defaultValue: 'single' },
      dozen_size_at_purchase: { type: DataTypes.INTEGER, allowNull: true },
      discount_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    },
    { sequelize, modelName: 'QuoteItem' }
  );
};
