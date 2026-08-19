'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('activity_timeline_entries', 'event_type', {
      type: Sequelize.ENUM(
        'booking_created',
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
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('activity_timeline_entries', 'event_type', {
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
    });
  },
};
