'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('risk_engine_submissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      payment_link_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'payment_links', key: 'id' },
        onDelete: 'CASCADE',
      },
      payload_json: { type: Sequelize.JSON, allowNull: false },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      response_json: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'submitted' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('risk_engine_submissions');
  },
};
