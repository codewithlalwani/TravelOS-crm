'use strict';

// Keep this list in sync with PERMISSION_CATALOG in lib/auth/permissions.ts.
const NEW_PERMISSIONS = [
  { key: 'flights.view', label: 'View flight bookings', group: 'Flights' },
  { key: 'flights.create', label: 'Create flight bookings', group: 'Flights' },
  { key: 'hotels.view', label: 'View hotel bookings', group: 'Hotels' },
  { key: 'hotels.create', label: 'Create hotel bookings', group: 'Hotels' },
];

const OLD_PERMISSIONS = [
  { key: 'bookings.view', label: 'View bookings', group: 'Bookings' },
  { key: 'bookings.create', label: 'Create bookings', group: 'Bookings' },
];

async function grantRolesHoldingKey(queryInterface, fromKey, toKeys) {
  const [fromPerm] = await queryInterface.sequelize.query(
    'SELECT id FROM permissions WHERE `key` = ?',
    { replacements: [fromKey] }
  );
  if (fromPerm.length === 0) return;

  const [roleRows] = await queryInterface.sequelize.query(
    'SELECT role_id FROM role_permissions WHERE permission_id = ?',
    { replacements: [fromPerm[0].id] }
  );
  if (roleRows.length === 0) return;

  const [toPerms] = await queryInterface.sequelize.query(
    `SELECT id FROM permissions WHERE \`key\` IN (${toKeys.map(() => '?').join(', ')})`,
    { replacements: toKeys }
  );

  const rows = [];
  for (const { role_id } of roleRows) {
    for (const { id } of toPerms) {
      rows.push({ role_id, permission_id: id });
    }
  }
  if (rows.length > 0) {
    await queryInterface.bulkInsert('role_permissions', rows, { ignoreDuplicates: true });
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'permissions',
      NEW_PERMISSIONS.map((p) => ({ ...p, created_at: now, updated_at: now }))
    );

    await grantRolesHoldingKey(queryInterface, 'bookings.view', ['flights.view', 'hotels.view']);
    await grantRolesHoldingKey(queryInterface, 'bookings.create', ['flights.create', 'hotels.create']);

    // Cascades and removes the now-obsolete role_permissions rows.
    await queryInterface.bulkDelete('permissions', {
      key: OLD_PERMISSIONS.map((p) => p.key),
    });
  },

  async down(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'permissions',
      OLD_PERMISSIONS.map((p) => ({ ...p, created_at: now, updated_at: now }))
    );

    await grantRolesHoldingKey(queryInterface, 'flights.view', ['bookings.view']);
    await grantRolesHoldingKey(queryInterface, 'hotels.create', ['bookings.create']);

    await queryInterface.bulkDelete('permissions', {
      key: NEW_PERMISSIONS.map((p) => p.key),
    });
  },
};
