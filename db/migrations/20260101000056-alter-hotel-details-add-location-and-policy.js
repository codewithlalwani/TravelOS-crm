'use strict';

/**
 * PayGlocal's riskData.lodgingData needs the hotel's own city/country (not the payer's billing
 * address) and its cancellation policy — none of which the free-text `address` column can supply.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hotel_details', 'city', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('hotel_details', 'country', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('hotel_details', 'cancellation_policy', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('hotel_details', 'cancellation_policy');
    await queryInterface.removeColumn('hotel_details', 'country');
    await queryInterface.removeColumn('hotel_details', 'city');
  },
};
