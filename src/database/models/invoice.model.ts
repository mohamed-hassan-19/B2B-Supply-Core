import { Model, DataTypes } from 'sequelize';

export class Invoice extends Model {
  declare id: number;
  declare invoice_number?: string;
  declare order_id: number;
  declare amount: number; // deprecated/alias for grand_total
  declare subtotal?: number;
  declare tax_rate?: number;
  declare tax_amount?: number;
  declare grand_total?: number;
  declare currency?: string;
  declare payment_method?: string;
  declare sales_order_reference?: string;
  declare customer_tax_id?: string;
  declare payment_status: 'paid' | 'pending' | 'overdue' | 'void';
  declare due_date?: Date;
  declare pdf_url?: string;
  declare pdf_generated_at?: Date;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initInvoice = (sequelize: any) => {
  Invoice.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      invoice_number: { type: DataTypes.STRING, unique: true },
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      subtotal: { type: DataTypes.DECIMAL(10, 2) },
      tax_rate: { type: DataTypes.DECIMAL(5, 4) },
      tax_amount: { type: DataTypes.DECIMAL(10, 2) },
      grand_total: { type: DataTypes.DECIMAL(10, 2) },
      currency: { type: DataTypes.STRING, defaultValue: 'EGP' },
      payment_method: { type: DataTypes.STRING },
      sales_order_reference: { type: DataTypes.STRING },
      customer_tax_id: { type: DataTypes.STRING },
      payment_status: { type: DataTypes.ENUM('paid', 'pending', 'overdue', 'void'), defaultValue: 'pending' },
      due_date: { type: DataTypes.DATE },
      pdf_url: { type: DataTypes.STRING },
      pdf_generated_at: { type: DataTypes.DATE },
    },
    { sequelize, modelName: 'Invoice' }
  );
};
