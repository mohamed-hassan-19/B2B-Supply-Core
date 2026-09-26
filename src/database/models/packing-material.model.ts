import { Model, DataTypes } from 'sequelize';

export class PackingMaterial extends Model {
  declare id: number;
  declare name: string;
  declare category: string;
  declare stock_quantity: number;
  declare low_stock_threshold?: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initPackingMaterial = (sequelize: any) => {
  PackingMaterial.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: false, defaultValue: 'General' },
      stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      low_stock_threshold: { type: DataTypes.INTEGER, allowNull: true },
    },
    { sequelize, modelName: 'PackingMaterial' }
  );
};
