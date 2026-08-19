'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_links', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      gateway_provider: { type: Sequelize.STRING, allowNull: false, defaultValue: 'payglocal' },
      gateway_link_id: { type: Sequelize.STRING, allowNull: true },
      link_url: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('created', 'expired', 'used', 'cancelled'),
        allowNull: false,
        defaultValue: 'created',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment_links');
  },
};
