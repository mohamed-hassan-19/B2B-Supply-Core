'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Create Categories table
    await queryInterface.createTable('Categories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 2. Add category_id to Products
    await queryInterface.addColumn('Products', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3. Extract unique categories and insert into Categories
    const [products] = await queryInterface.sequelize.query(
      `SELECT DISTINCT category FROM "Products" WHERE category IS NOT NULL AND category != ''`
    );

    for (const p of products) {
      await queryInterface.sequelize.query(
        `INSERT INTO "Categories" (name, "createdAt", "updatedAt") VALUES (:name, :date, :date)`,
        {
          replacements: { name: p.category, date: new Date() }
        }
      );
    }

    // 4. Update Products with new category_id
    await queryInterface.sequelize.query(
      `UPDATE "Products" SET category_id = (SELECT id FROM "Categories" WHERE name = "Products".category)`
    );

    // 5. Drop old category column
    await queryInterface.removeColumn('Products', 'category');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('Products', 'category', {
      type: Sequelize.STRING
    });

    await queryInterface.sequelize.query(
      `UPDATE "Products" SET category = (SELECT name FROM "Categories" WHERE id = "Products".category_id)`
    );

    await queryInterface.removeColumn('Products', 'category_id');
    await queryInterface.dropTable('Categories');
  }
};
