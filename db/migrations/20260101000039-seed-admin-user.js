'use strict';

const bcrypt = require('bcryptjs');

const isProd = process.env.NODE_ENV === 'production';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || (isProd ? null : 'admin@flightconnect.test');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProd ? null : 'Admin@12345');
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Admin';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD must be set in the production environment before running migrations'
      );
    }

    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = ?',
      { replacements: [ADMIN_EMAIL] }
    );
    if (existing.length > 0) return;

    const [roles] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE `key` = 'admin'"
    );
    if (roles.length === 0) {
      throw new Error("Admin role not found — the create-roles migration must run before this one");
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await queryInterface.bulkInsert('users', [
      {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        role_id: roles[0].id,
        is_active: true,
        created_by: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: ADMIN_EMAIL });
  },
};
