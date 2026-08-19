'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_ref: { type: Sequelize.STRING, allowNull: false, unique: true },
      type: {
        type: Sequelize.ENUM('flight', 'hotel', 'car', 'train', 'cruise'),
        allowNull: false,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'RESTRICT',
      },
      agent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM(
          'created',
          'auth_sent',
          'authorized',
          'payment_link_created',
          'payment_received',
          'primary_doc_uploaded',
          'primary_doc_sent',
          'invoiced',
          'completed'
        ),
        allowNull: false,
        defaultValue: 'created',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bookings');
  },
};
