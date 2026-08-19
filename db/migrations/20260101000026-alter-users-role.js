'use strict';

const AGENT_DEFAULT_PERMISSION_KEYS = [
  'bookings.view',
  'bookings.create',
  'bookings.authorize',
  'bookings.payment',
  'bookings.documents',
  'bookings.invoice',
  'customers.view',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.addColumn('users', 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'roles', key: 'id' },
      onDelete: 'RESTRICT',
    });

    await queryInterface.bulkInsert('roles', [
      { key: 'admin', name: 'Admin', created_at: now, updated_at: now },
      { key: 'agent', name: 'Agent', created_at: now, updated_at: now },
    ]);

    const [roles] = await queryInterface.sequelize.query(
      "SELECT id, `key` FROM roles WHERE `key` IN ('admin', 'agent')"
    );
    const adminRoleId = roles.find((r) => r.key === 'admin').id;
    const agentRoleId = roles.find((r) => r.key === 'agent').id;

    const [permissions] = await queryInterface.sequelize.query(
      `SELECT id, \`key\` FROM permissions WHERE \`key\` IN (${AGENT_DEFAULT_PERMISSION_KEYS.map(
        (k) => `'${k}'`
      ).join(', ')})`
    );
    await queryInterface.bulkInsert(
      'role_permissions',
      permissions.map((p) => ({ role_id: agentRoleId, permission_id: p.id }))
    );

    await queryInterface.sequelize.query(
      `UPDATE users SET role_id = CASE WHEN role = 'admin' THEN ${adminRoleId} ELSE ${agentRoleId} END`
    );

    await queryInterface.changeColumn('users', 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'RESTRICT',
    });

    await queryInterface.removeColumn('users', 'role');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.ENUM('admin', 'agent'),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE users u
      JOIN roles r ON r.id = u.role_id
      SET u.role = r.\`key\`
    `);

    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM('admin', 'agent'),
      allowNull: false,
      defaultValue: 'agent',
    });

    await queryInterface.removeColumn('users', 'role_id');
  },
};
