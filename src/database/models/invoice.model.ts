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
  declare readonly days_remaining?: number | null;

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
      days_remaining: {
        type: DataTypes.VIRTUAL,
        get() {
          const status = this.getDataValue('payment_status');
          if (status !== 'pending') return null;
          const dueDate = this.getDataValue('due_date');
          if (!dueDate) return null;
          // Calculate difference from midnight today to midnight of due date for consistency
          const now = new Date();
          now.setHours(0,0,0,0);
          const dDate = new Date(dueDate);
          dDate.setHours(0,0,0,0);
          const diffMs = dDate.getTime() - now.getTime();
          return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
      }
    },
    { sequelize, modelName: 'Invoice' }
  );
};
