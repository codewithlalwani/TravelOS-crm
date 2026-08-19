'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bookings', 'cancelled_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('bookings', 'cancelled_reason', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('bookings', 'cancelled_by_name', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bookings', 'cancelled_by_name');
    await queryInterface.removeColumn('bookings', 'cancelled_reason');
    await queryInterface.removeColumn('bookings', 'cancelled_at');
  },
};
