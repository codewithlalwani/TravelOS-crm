'use strict';

// Keep this list in sync with PERMISSION_CATALOG in lib/auth/permissions.ts.
const PERMISSION_CATALOG = [
  { key: 'bookings.view', label: 'View bookings', group: 'Bookings' },
  { key: 'bookings.create', label: 'Create bookings', group: 'Bookings' },
  { key: 'bookings.authorize', label: 'Send / record ticket authorization', group: 'Bookings' },
  { key: 'bookings.payment', label: 'Create / send payment links', group: 'Bookings' },
  { key: 'bookings.documents', label: 'Upload / send documents', group: 'Bookings' },
  { key: 'bookings.invoice', label: 'Generate / send invoices', group: 'Bookings' },
  { key: 'customers.view', label: 'View customers', group: 'Customers' },
  { key: 'analytics.view', label: 'View analytics', group: 'Analytics' },
  { key: 'users.view', label: 'View users', group: 'Users' },
  { key: 'users.manage', label: 'Create users, activate/deactivate', group: 'Users' },
  { key: 'roles.manage', label: 'Manage roles and permissions', group: 'Roles' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING, allowNull: false, unique: true },
      label: { type: Sequelize.STRING, allowNull: false },
      group: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      'permissions',
      PERMISSION_CATALOG.map((p) => ({ ...p, created_at: now, updated_at: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permissions');
  },
};
