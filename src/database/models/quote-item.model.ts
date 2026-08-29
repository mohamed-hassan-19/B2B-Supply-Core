import { Model, DataTypes } from 'sequelize';

export class QuoteItem extends Model {
  declare id: number;
  declare quote_id: number;
  declare product_id?: number | null;
  declare requested_quantity: number;
  declare quoted_price?: number | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initQuoteItem = (sequelize: any) => {
  QuoteItem.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      quote_id: { type: DataTypes.INTEGER, allowNull: false },
      product_id: { type: DataTypes.INTEGER, allowNull: true },
      requested_quantity: { type: DataTypes.INTEGER, allowNull: false },
      quoted_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    },
    { sequelize, modelName: 'QuoteItem' }
  );
};
