'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bookings', 'total_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn('bookings', 'currency', { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bookings', 'currency');
    await queryInterface.removeColumn('bookings', 'total_amount');
  },
};
