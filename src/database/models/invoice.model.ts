import { Model, DataTypes } from 'sequelize';

export class Invoice extends Model {
  declare id: number;
  declare order_id: number;
  declare amount: number;
  declare payment_status: 'paid' | 'pending' | 'overdue';
  declare due_date?: Date;
  declare pdf_url?: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initInvoice = (sequelize: any) => {
  Invoice.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      payment_status: { type: DataTypes.ENUM('paid', 'pending', 'overdue'), defaultValue: 'pending' },
      due_date: { type: DataTypes.DATE },
      pdf_url: { type: DataTypes.STRING },
    },
    { sequelize, modelName: 'Invoice' }
  );
};
