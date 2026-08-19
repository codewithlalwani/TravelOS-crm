'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('booking_fares', 'net', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('booking_fares', 'mco', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('booking_fares', 'mco');
    await queryInterface.removeColumn('booking_fares', 'net');
  },
};
