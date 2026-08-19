'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('booking_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
      },
      doc_type: {
        type: Sequelize.ENUM(
          'ticket',
          'hotel_voucher',
          'car_voucher',
          'train_ticket',
          'cruise_document',
          'invoice',
          'passport',
          'visa',
          'other'
        ),
        allowNull: false,
      },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      file_url: { type: Sequelize.STRING, allowNull: false },
      uploaded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('booking_documents');
  },
};
