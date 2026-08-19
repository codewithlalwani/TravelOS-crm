'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('ticket_authorizations', 'card_last4');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('ticket_authorizations', 'card_last4', { type: Sequelize.STRING(4), allowNull: true });
  },
};
