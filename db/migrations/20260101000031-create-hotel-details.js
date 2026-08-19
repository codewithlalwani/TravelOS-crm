'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hotel_details', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      hotel_name: { type: Sequelize.STRING, allowNull: false },
      address: { type: Sequelize.STRING, allowNull: false },
      check_in: { type: Sequelize.DATEONLY, allowNull: false },
      check_out: { type: Sequelize.DATEONLY, allowNull: false },
      room_type: { type: Sequelize.STRING, allowNull: false },
      guests: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      rate_per_night: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      taxes_and_fees: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      confirmation_no: { type: Sequelize.STRING, allowNull: false },
      hotel_rating: { type: Sequelize.DECIMAL(2, 1), allowNull: true },
      special_request: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hotel_details');
  },
};
