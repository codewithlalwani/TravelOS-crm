'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('car_details', 'pickup_state', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('car_details', 'dropoff_state', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('car_details', 'dropoff_state');
    await queryInterface.removeColumn('car_details', 'pickup_state');
  },
};
