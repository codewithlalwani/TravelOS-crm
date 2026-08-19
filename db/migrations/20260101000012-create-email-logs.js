'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      template_type: {
        type: Sequelize.ENUM('ticket_authorization', 'primary_document', 'invoice'),
        allowNull: false,
      },
      to_email: { type: Sequelize.STRING, allowNull: false },
      subject: { type: Sequelize.STRING, allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      sent_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      status: { type: Sequelize.ENUM('sent', 'failed'), allowNull: false, defaultValue: 'sent' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_logs');
  },
};
