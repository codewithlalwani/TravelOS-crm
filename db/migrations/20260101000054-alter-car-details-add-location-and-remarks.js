'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('car_details', 'pickup_city', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('car_details', 'pickup_country', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('car_details', 'dropoff_city', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('car_details', 'dropoff_country', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('car_details', 'rate_remarks', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('car_details', 'special_request', { type: Sequelize.TEXT, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('car_details', 'special_request');
    await queryInterface.removeColumn('car_details', 'rate_remarks');
    await queryInterface.removeColumn('car_details', 'dropoff_country');
    await queryInterface.removeColumn('car_details', 'dropoff_city');
    await queryInterface.removeColumn('car_details', 'pickup_country');
    await queryInterface.removeColumn('car_details', 'pickup_city');
  },
};
