'use strict';

// Keep this list in sync with PERMISSION_CATALOG in lib/auth/permissions.ts.
const NEW_PERMISSIONS = [
  { key: 'cars.view', label: 'View car bookings', group: 'Cars' },
  { key: 'cars.create', label: 'Create car bookings', group: 'Cars' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'permissions',
      NEW_PERMISSIONS.map((p) => ({ ...p, created_at: now, updated_at: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', {
      key: NEW_PERMISSIONS.map((p) => p.key),
    });
  },
};
