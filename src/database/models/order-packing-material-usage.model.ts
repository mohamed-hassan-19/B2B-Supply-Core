import { Model, DataTypes } from 'sequelize';
import { PackingMaterial } from './packing-material.model';
import { AdminUser } from './admin-user.model';
import { Order } from './order.model';

export class OrderPackingMaterialUsage extends Model {
  declare id: number;
  declare order_id: number;
  declare packing_material_id: number;
  declare quantity_used: number;
  declare used_by_id: number;

  declare PackingMaterial?: PackingMaterial;
  declare AdminUser?: AdminUser;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initOrderPackingMaterialUsage = (sequelize: any) => {
  OrderPackingMaterialUsage.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      packing_material_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity_used: { type: DataTypes.INTEGER, allowNull: false },
      used_by_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'OrderPackingMaterialUsage' }
  );
};
