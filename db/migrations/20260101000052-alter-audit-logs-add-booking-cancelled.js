'use strict';

const PREVIOUS_EVENT_TYPES = [
  'login_success',
  'login_failed',
  'logout',
  'user_created',
  'user_activated',
  'user_deactivated',
  'role_created',
  'role_updated',
  'role_deleted',
  'booking_created',
  'booking_updated',
  'auth_email_sent',
  'auth_received',
  'payment_link_created',
  'payment_link_shared',
  'payment_received',
  'primary_doc_uploaded',
  'primary_doc_sent',
  'invoice_generated',
  'invoice_sent',
  'note_added',
  'note_updated',
  'note_deleted',
];

const NEW_EVENT_TYPES = [...PREVIOUS_EVENT_TYPES, 'booking_cancelled'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('audit_logs', 'event_type', {
      type: Sequelize.ENUM(...NEW_EVENT_TYPES),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('audit_logs', 'event_type', {
      type: Sequelize.ENUM(...PREVIOUS_EVENT_TYPES),
      allowNull: false,
    });
  },
};
