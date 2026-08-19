'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_access_locations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      label: { type: Sequelize.STRING, allowNull: false },
      place_id: { type: Sequelize.STRING, allowNull: false },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      radius_km: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 25 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('user_access_locations', ['user_id']);

    await queryInterface.sequelize.query(`
      INSERT INTO user_access_locations (user_id, label, place_id, latitude, longitude, radius_km, created_at, updated_at)
      SELECT id, access_location, access_place_id, access_latitude, access_longitude, access_radius_km, NOW(), NOW()
      FROM users
      WHERE access_place_id IS NOT NULL AND access_latitude IS NOT NULL AND access_longitude IS NOT NULL
    `);

    await queryInterface.createTable('login_histories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      login_id: { type: Sequelize.STRING, allowNull: false },
      login_status: { type: Sequelize.BOOLEAN, allowNull: false },
      login_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      logout_time: { type: Sequelize.DATE, allowNull: true },
      ip_country: { type: Sequelize.STRING, allowNull: true },
      ip_city: { type: Sequelize.STRING, allowNull: true },
      failure_reason: { type: Sequelize.STRING, allowNull: true },
    });
    await queryInterface.addIndex('login_histories', ['login_time']);
    await queryInterface.addIndex('login_histories', ['login_id']);
    await queryInterface.addIndex('login_histories', ['login_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('login_histories');
    await queryInterface.dropTable('user_access_locations');
  },
};
