'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('booking_fares', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      pax_type: {
        type: Sequelize.ENUM('SRC', 'ADT', 'YTH', 'CHD', 'INF'),
        allowNull: false,
      },
      base_fare: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      tax: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      gross: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('booking_fares');
  },
};
