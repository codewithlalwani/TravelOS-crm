'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('flight_details', 'airline');
    await queryInterface.addColumn('flight_details', 'cabin_class', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'gds', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'ticketing_supplier', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'trip_type', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'journey_type', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'fare_type', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'ticketing_deadline', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('flight_details', 'ticketing_deadline_time', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'supplier_reference', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('flight_details', 'buy_currency', { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' });
    await queryInterface.addColumn('flight_details', 'sell_currency', { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' });
    await queryInterface.addColumn('flight_details', 'rate_remarks', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('flight_details', 'special_request', { type: Sequelize.TEXT, allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('flight_details', 'special_request');
    await queryInterface.removeColumn('flight_details', 'rate_remarks');
    await queryInterface.removeColumn('flight_details', 'sell_currency');
    await queryInterface.removeColumn('flight_details', 'buy_currency');
    await queryInterface.removeColumn('flight_details', 'supplier_reference');
    await queryInterface.removeColumn('flight_details', 'ticketing_deadline_time');
    await queryInterface.removeColumn('flight_details', 'ticketing_deadline');
    await queryInterface.removeColumn('flight_details', 'fare_type');
    await queryInterface.removeColumn('flight_details', 'journey_type');
    await queryInterface.removeColumn('flight_details', 'trip_type');
    await queryInterface.removeColumn('flight_details', 'ticketing_supplier');
    await queryInterface.removeColumn('flight_details', 'gds');
    await queryInterface.removeColumn('flight_details', 'cabin_class');
    await queryInterface.addColumn('flight_details', 'airline', { type: Sequelize.STRING, allowNull: false, defaultValue: '' });
  },
};
