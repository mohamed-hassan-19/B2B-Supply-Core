import { Model, DataTypes } from 'sequelize';

export class Incident extends Model {
  declare id: number;
  declare order_id: number | null;
  declare product_id: number | null;
  declare type: 'damaged_product' | 'damaged_order' | 'missing_product' | 'incorrect_product' | 'other';
  declare description: string;
  declare status: 'open' | 'in_progress' | 'resolved';
  declare resolution: string | null;
  declare created_by: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initIncident = (sequelize: any) => {
  Incident.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.INTEGER, allowNull: true },
      product_id: { type: DataTypes.INTEGER, allowNull: true },
      type: { 
        type: DataTypes.ENUM('damaged_product', 'damaged_order', 'missing_product', 'incorrect_product', 'other'), 
        allowNull: false 
      },
      description: { type: DataTypes.TEXT, allowNull: false },
      status: { 
        type: DataTypes.ENUM('open', 'in_progress', 'resolved'), 
        allowNull: false, 
        defaultValue: 'open' 
      },
      resolution: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'Incident' }
  );
};
