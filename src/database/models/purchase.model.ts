import { Model, DataTypes } from 'sequelize';

export class Purchase extends Model {
  declare id: number;
  declare product_id: number | null;
  declare supplier_name: string | null;
  declare quantity_purchased: number;
  declare unit_cost: number;
  declare total_cost: number;
  declare purchase_date: Date | string;
  declare created_by: number | null;
  declare notes: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initPurchase = (sequelize: any) => {
  Purchase.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      product_id: { type: DataTypes.INTEGER, allowNull: true },
      supplier_name: { type: DataTypes.STRING, allowNull: true },
      quantity_purchased: { type: DataTypes.INTEGER, allowNull: false },
      unit_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      purchase_date: { type: DataTypes.DATEONLY, allowNull: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    { sequelize, modelName: 'Purchase' }
  );
};
