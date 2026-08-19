'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('flight_segments', 'dep_city', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_segments', 'dep_country', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_segments', 'arr_city', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_segments', 'arr_country', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('flight_segments', 'arr_country');
    await queryInterface.removeColumn('flight_segments', 'arr_city');
    await queryInterface.removeColumn('flight_segments', 'dep_country');
    await queryInterface.removeColumn('flight_segments', 'dep_city');
  },
};
