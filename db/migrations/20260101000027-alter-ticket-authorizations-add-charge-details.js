'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ticket_authorizations', 'card_last4', { type: Sequelize.STRING(4), allowNull: true });
    await queryInterface.addColumn('ticket_authorizations', 'authorized_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn('ticket_authorizations', 'authorization_date', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('ticket_authorizations', 'charges', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.addColumn('ticket_authorizations', 'refund_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn('ticket_authorizations', 'e_signature_name', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ticket_authorizations', 'e_signature_name');
    await queryInterface.removeColumn('ticket_authorizations', 'refund_amount');
    await queryInterface.removeColumn('ticket_authorizations', 'charges');
    await queryInterface.removeColumn('ticket_authorizations', 'authorization_date');
    await queryInterface.removeColumn('ticket_authorizations', 'authorized_amount');
    await queryInterface.removeColumn('ticket_authorizations', 'card_last4');
  },
};
