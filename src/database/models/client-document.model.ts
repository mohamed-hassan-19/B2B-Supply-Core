import { Model, DataTypes } from 'sequelize';

export class ClientDocument extends Model {
  declare id: number;
  declare client_id: number;
  declare file_name: string;
  declare file_url: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initClientDocument = (sequelize: any) => {
  ClientDocument.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      client_id: { type: DataTypes.INTEGER, allowNull: false },
      file_name: { type: DataTypes.STRING, allowNull: false },
      file_url: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, modelName: 'ClientDocument' }
  );
};
