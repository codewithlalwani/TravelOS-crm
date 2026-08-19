'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('customers', 'gst_number', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('customers', 'gst_company_name', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('customers', 'gst_company_name');
    await queryInterface.removeColumn('customers', 'gst_number');
  },
};
