import { Model, DataTypes } from 'sequelize';

export class Category extends Model {
  declare id: number;
  declare name: string;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initCategory = (sequelize: any) => {
  Category.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    { sequelize, modelName: 'Category' }
  );
};
