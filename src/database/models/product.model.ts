import { Model, DataTypes } from 'sequelize';

export class Product extends Model {
  declare id: number;
  declare name: string;
  declare description?: string;
  declare category?: string;
  declare images?: any;
  declare price: number;
  declare original_price?: number;
  declare stock_level: number;
  declare is_active: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initProduct = (sequelize: any) => {
  Product.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      category: { type: DataTypes.STRING },
      images: { type: DataTypes.JSON },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      original_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      stock_level: { type: DataTypes.INTEGER, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    },
    { sequelize, modelName: 'Product' }
  );
};
