'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'access_place_id', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('users', 'access_latitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
    await queryInterface.addColumn('users', 'access_longitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
    await queryInterface.addColumn('users', 'access_radius_km', { type: Sequelize.FLOAT, allowNull: false, defaultValue: 25 });
    await queryInterface.addColumn('users', 'last_login_ip_latitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
    await queryInterface.addColumn('users', 'last_login_ip_longitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
    await queryInterface.addColumn('users', 'last_login_location_method', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('users', 'last_login_distance_km', { type: Sequelize.FLOAT, allowNull: true });
  },

  async down(queryInterface) {
    for (const column of ['last_login_distance_km', 'last_login_location_method', 'last_login_ip_longitude', 'last_login_ip_latitude', 'access_radius_km', 'access_longitude', 'access_latitude', 'access_place_id']) {
      await queryInterface.removeColumn('users', column);
    }
  },
};
