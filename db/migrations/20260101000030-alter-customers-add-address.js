'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('customers', 'address_street1', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('customers', 'address_city', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('customers', 'address_state', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('customers', 'address_country', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('customers', 'address_country');
    await queryInterface.removeColumn('customers', 'address_state');
    await queryInterface.removeColumn('customers', 'address_city');
    await queryInterface.removeColumn('customers', 'address_street1');
  },
};
