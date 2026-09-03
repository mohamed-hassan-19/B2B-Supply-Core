import { Model, DataTypes } from 'sequelize';

export class Client extends Model {
  declare id: number;
  declare company_name: string;
  declare email: string;
  declare password_hash: string;
  declare commercial_registration?: string;
  declare tax_registration?: string;
  declare contact_details?: any;
  declare payment_method?: 'COD' | 'Credit';
  declare status: 'pending' | 'approved' | 'rejected';
  declare credit_limit?: number;
  declare credit_terms?: number;
  declare is_priority: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initClient = (sequelize: any) => {
  Client.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      company_name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING, allowNull: false },
      commercial_registration: { type: DataTypes.STRING },
      tax_registration: { type: DataTypes.STRING },
      contact_details: { type: DataTypes.JSON },
      payment_method: { type: DataTypes.ENUM('COD', 'Credit') },
      status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
      credit_limit: { type: DataTypes.DECIMAL(10, 2) },
      credit_terms: { type: DataTypes.INTEGER },
      is_priority: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { sequelize, modelName: 'Client' }
  );
};
