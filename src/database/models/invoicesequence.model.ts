import { Model, DataTypes } from 'sequelize';

export class InvoiceSequence extends Model {
  declare id: number;
  declare year: number;
  declare last_value: number;
}

export const initInvoiceSequence = (sequelize: any) => {
  InvoiceSequence.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      year: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      last_value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      tableName: 'InvoiceSequences',
      timestamps: true
    }
  );
};
