'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('car_details', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      pickup_location: { type: Sequelize.STRING, allowNull: false },
      pickup_station_type: { type: Sequelize.STRING, allowNull: false },
      pickup_station: { type: Sequelize.STRING, allowNull: true },
      pickup_date_time: { type: Sequelize.DATE, allowNull: false },
      dropoff_different_location: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      dropoff_location: { type: Sequelize.STRING, allowNull: false },
      dropoff_station_type: { type: Sequelize.STRING, allowNull: false },
      dropoff_station: { type: Sequelize.STRING, allowNull: true },
      dropoff_date_time: { type: Sequelize.DATE, allowNull: false },
      meeting_point: { type: Sequelize.TEXT, allowNull: true },
      booking_status: { type: Sequelize.STRING, allowNull: false },
      supplier_ref: { type: Sequelize.STRING, allowNull: false },
      supplier_type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Offline' },
      supplier: { type: Sequelize.STRING, allowNull: false },
      vehicle_code: { type: Sequelize.STRING, allowNull: true },
      vehicle_name: { type: Sequelize.STRING, allowNull: true },
      max_pax: { type: Sequelize.INTEGER, allowNull: true },
      max_luggage: { type: Sequelize.INTEGER, allowNull: true },
      no_of_vehicles: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('car_details');
  },
};
