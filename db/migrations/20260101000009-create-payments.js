'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
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
      transaction_id: { type: Sequelize.STRING, allowNull: true },
      gateway_reference_number: { type: Sequelize.STRING, allowNull: true },
      amount_paid: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      currency: { type: Sequelize.STRING(3), allowNull: true },
      payment_method: { type: Sequelize.STRING, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  },
};
