'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('email_logs', 'template_type', {
      type: Sequelize.ENUM('ticket_authorization', 'primary_document', 'invoice', 'payment_link'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('email_logs', 'template_type', {
      type: Sequelize.ENUM('ticket_authorization', 'primary_document', 'invoice'),
      allowNull: false,
    });
  },
};
