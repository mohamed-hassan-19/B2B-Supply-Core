import { Model, DataTypes } from 'sequelize';

export class Order extends Model {
  declare id: number;
  declare client_id: number;
  declare status: 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  declare payment_method: 'COD' | 'Credit';
  declare total_amount: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initOrder = (sequelize: any) => {
  Order.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      client_id: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.ENUM('pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'), defaultValue: 'pending' },
      payment_method: { type: DataTypes.ENUM('COD', 'Credit'), allowNull: false },
      total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    },
    { sequelize, modelName: 'Order' }
  );
};
