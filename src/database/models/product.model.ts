import { Model, DataTypes } from 'sequelize';

export class Product extends Model {
  declare id: number;
  declare name: string;
  declare description?: string;
  declare category_id?: number;
  declare Category?: any; // To allow include
  declare images?: any;
  declare price: number;
  declare original_price?: number;
  declare stock_level: number;
  declare low_stock_threshold: number;
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
      category_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Categories', key: 'id' } },
      images: { type: DataTypes.JSON },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      original_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      stock_level: { type: DataTypes.INTEGER, defaultValue: 0 },
      low_stock_threshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    },
    { sequelize, modelName: 'Product' }
  );
};
