'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('travel_provider_logos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      category: {
        type: Sequelize.ENUM('rail', 'hotel', 'car_rental', 'cruise', 'flight'),
        allowNull: false,
      },
      provider_name: { type: Sequelize.STRING, allowNull: false },
      provider_code: { type: Sequelize.STRING(20), allowNull: true },
      logo_url: { type: Sequelize.TEXT, allowNull: false },
      website_url: { type: Sequelize.TEXT, allowNull: true },
      alt_text: { type: Sequelize.STRING, allowNull: false },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addConstraint('travel_provider_logos', {
      fields: ['category', 'provider_name'],
      type: 'unique',
      name: 'travel_provider_logos_category_provider_name_unique',
    });
    await queryInterface.addIndex('travel_provider_logos', ['category', 'is_active', 'display_order'], {
      name: 'travel_provider_logos_category_active_order',
    });
    await queryInterface.addIndex('travel_provider_logos', ['category', 'provider_code'], {
      name: 'travel_provider_logos_category_provider_code',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('travel_provider_logos');
  },
};
