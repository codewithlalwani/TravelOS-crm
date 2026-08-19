'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_timeline_entries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      event_type: {
        type: Sequelize.ENUM(
          'auth_email_sent',
          'auth_received',
          'payment_link_created',
          'payment_received',
          'primary_doc_uploaded',
          'primary_doc_sent',
          'invoice_generated',
          'invoice_sent'
        ),
        allowNull: false,
      },
      description: { type: Sequelize.STRING, allowNull: false },
      actor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      occurred_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('activity_timeline_entries', ['booking_id', 'occurred_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_timeline_entries');
  },
};
