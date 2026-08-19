'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('flight_segments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      sequence: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      flight_number: { type: Sequelize.STRING, allowNull: true },
      airline: { type: Sequelize.STRING, allowNull: false },
      airline_pnr: { type: Sequelize.STRING, allowNull: true },
      dep_airport: { type: Sequelize.STRING, allowNull: false },
      dep_date: { type: Sequelize.DATEONLY, allowNull: false },
      dep_time: { type: Sequelize.STRING, allowNull: true },
      dep_terminal: { type: Sequelize.STRING, allowNull: true },
      arr_airport: { type: Sequelize.STRING, allowNull: false },
      arr_date: { type: Sequelize.DATEONLY, allowNull: true },
      arr_time: { type: Sequelize.STRING, allowNull: true },
      arr_terminal: { type: Sequelize.STRING, allowNull: true },
      booking_class: { type: Sequelize.STRING, allowNull: true },
      cabin_class: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'HK' },
      operated_by: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('flight_segments');
  },
};
