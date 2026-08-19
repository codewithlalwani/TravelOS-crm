'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('passengers', 'name');
    await queryInterface.addColumn('passengers', 'title', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('passengers', 'first_name', { type: Sequelize.STRING, allowNull: false, defaultValue: '' });
    await queryInterface.addColumn('passengers', 'middle_name', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('passengers', 'last_name', { type: Sequelize.STRING, allowNull: false, defaultValue: '' });
    await queryInterface.addColumn('passengers', 'gender', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('passengers', 'pax_type', {
      type: Sequelize.ENUM('SRC', 'ADT', 'YTH', 'CHD', 'INF'),
      allowNull: false,
      defaultValue: 'ADT',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('passengers', 'pax_type');
    await queryInterface.removeColumn('passengers', 'gender');
    await queryInterface.removeColumn('passengers', 'last_name');
    await queryInterface.removeColumn('passengers', 'middle_name');
    await queryInterface.removeColumn('passengers', 'first_name');
    await queryInterface.removeColumn('passengers', 'title');
    await queryInterface.addColumn('passengers', 'name', { type: Sequelize.STRING, allowNull: false, defaultValue: '' });
  },
};
