'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('permissions', [
      { key: 'bookings.cancel', label: 'Cancel bookings', group: 'Bookings', created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', { key: 'bookings.cancel' });
  },
};
