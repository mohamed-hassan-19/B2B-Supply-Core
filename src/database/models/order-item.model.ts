import { Model, DataTypes } from 'sequelize';

export class OrderItem extends Model {
  declare id: number;
  declare order_id: number;
  declare product_id?: number | null;
  declare product_name: string;
  declare quantity: number;
  declare unit_price: number;
  declare purchase_unit: 'single' | 'dozen';
  declare dozen_size_at_purchase?: number;
  declare discount_percentage?: number | null;
  declare discount_amount?: number | null;
  declare is_cancelled: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initOrderItem = (sequelize: any) => {
  OrderItem.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      product_id: { type: DataTypes.INTEGER, allowNull: true },
      product_name: { type: DataTypes.STRING, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      purchase_unit: { type: DataTypes.ENUM('single', 'dozen'), allowNull: false, defaultValue: 'single' },
      dozen_size_at_purchase: { type: DataTypes.INTEGER, allowNull: true },
      discount_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      is_cancelled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { sequelize, modelName: 'OrderItem' }
  );
};
