'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bookings', 'net_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn('bookings', 'mco_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bookings', 'mco_amount');
    await queryInterface.removeColumn('bookings', 'net_amount');
  },
};
