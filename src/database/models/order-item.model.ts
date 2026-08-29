import { Model, DataTypes } from 'sequelize';

export class OrderItem extends Model {
  declare id: number;
  declare order_id: number;
  declare product_id?: number | null;
  declare product_name: string;
  declare quantity: number;
  declare unit_price: number;

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
    },
    { sequelize, modelName: 'OrderItem' }
  );
};
