'use strict';

const PREVIOUS_EVENT_TYPES = [
  'booking_created',
  'auth_email_sent',
  'auth_received',
  'payment_link_created',
  'payment_link_shared',
  'payment_received',
  'primary_doc_uploaded',
  'primary_doc_sent',
  'invoice_generated',
  'invoice_sent',
];

const NEW_EVENT_TYPES = [
  ...PREVIOUS_EVENT_TYPES,
  'booking_viewed',
  'note_added',
  'note_updated',
  'note_deleted',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('activity_timeline_entries', 'event_type', {
      type: Sequelize.ENUM(...NEW_EVENT_TYPES),
      allowNull: false,
    });

    await queryInterface.addColumn('activity_timeline_entries', 'actor_email', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('activity_timeline_entries', 'actor_role', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('activity_timeline_entries', 'actor_role');
    await queryInterface.removeColumn('activity_timeline_entries', 'actor_email');

    await queryInterface.changeColumn('activity_timeline_entries', 'event_type', {
      type: Sequelize.ENUM(...PREVIOUS_EVENT_TYPES),
      allowNull: false,
    });
  },
};
