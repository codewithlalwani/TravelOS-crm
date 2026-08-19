'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'last_login_latitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'last_login_longitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'last_login_accuracy', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'last_login_location_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'last_login_location_at');
    await queryInterface.removeColumn('users', 'last_login_accuracy');
    await queryInterface.removeColumn('users', 'last_login_longitude');
    await queryInterface.removeColumn('users', 'last_login_latitude');
  },
};
