import { Model, DataTypes } from 'sequelize';

export class OrderActivityLog extends Model {
  declare id: number;
  declare order_id: number;
  declare action_type: 'created' | 'status_changed' | 'discount_changed' | 'revision_proposed' | 'revision_accepted' | 'revision_rejected' | 'incident_raised' | 'incident_resolved';
  declare actor: string;
  declare from_status: string | null;
  declare to_status: string | null;
  declare description: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initOrderActivityLog = (sequelize: any) => {
  OrderActivityLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      action_type: { 
        type: DataTypes.ENUM(
          'created',
          'status_changed',
          'discount_changed',
          'revision_proposed',
          'revision_accepted',
          'revision_rejected',
          'incident_raised',
          'incident_resolved'
        ), 
        allowNull: false 
      },
      actor: { type: DataTypes.STRING, allowNull: false },
      from_status: { type: DataTypes.STRING, allowNull: true },
      to_status: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
    },
    { sequelize, modelName: 'OrderActivityLog' }
  );
};
