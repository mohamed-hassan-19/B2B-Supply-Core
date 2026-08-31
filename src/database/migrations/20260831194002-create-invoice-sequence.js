module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('InvoiceSequences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      last_value: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('InvoiceSequences');
  }
};
