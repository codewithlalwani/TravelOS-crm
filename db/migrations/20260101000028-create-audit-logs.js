'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      event_type: {
        type: Sequelize.ENUM(
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
          'auth_email_sent',
          'auth_received',
          'payment_link_created',
          'payment_link_shared',
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
      actor_email: { type: Sequelize.STRING, allowNull: true },
      target_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'SET NULL',
      },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      occurred_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('audit_logs', ['occurred_at']);
    await queryInterface.addIndex('audit_logs', ['event_type']);
    await queryInterface.addIndex('audit_logs', ['actor_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
