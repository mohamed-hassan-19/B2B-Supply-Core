import { Model, DataTypes } from 'sequelize';

export class AdminUser extends Model {
  declare id: number;
  declare name: string;
  declare email: string;
  declare password_hash: string;
  declare role: 'super_admin' | 'sales' | 'warehouse' | 'finance';
  declare is_active: boolean;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initAdminUser = (sequelize: any) => {
  AdminUser.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.ENUM('super_admin', 'sales', 'warehouse', 'finance'), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { sequelize, modelName: 'AdminUser' }
  );
};
