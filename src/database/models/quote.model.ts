import { Model, DataTypes } from 'sequelize';

export class Quote extends Model {
  declare id: number;
  declare client_id: number;
  declare order_id?: number | null;
  declare related_order_id?: number | null;
  declare status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';
  declare valid_until?: Date | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initQuote = (sequelize: any) => {
  Quote.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      client_id: { type: DataTypes.INTEGER, allowNull: false },
      order_id: { type: DataTypes.INTEGER, allowNull: true },
      related_order_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.ENUM('pending', 'sent', 'accepted', 'rejected', 'expired'), defaultValue: 'pending' },
      valid_until: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Quote' }
  );
};
