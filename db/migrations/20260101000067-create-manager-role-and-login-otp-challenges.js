'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('roles', [
      { key: 'manager', name: 'Manager', created_at: now, updated_at: now },
    ], { ignoreDuplicates: true });

    await queryInterface.createTable('login_otp_challenges', {
      id: { type: Sequelize.UUID, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      code_hash: { type: Sequelize.STRING, allowNull: false },
      remember: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      next_path: { type: Sequelize.STRING, allowNull: false, defaultValue: '/dashboard' },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      ip_country: { type: Sequelize.STRING, allowNull: true },
      ip_city: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      consumed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('login_otp_challenges', ['user_id']);
    await queryInterface.addIndex('login_otp_challenges', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('login_otp_challenges');
    const [roles] = await queryInterface.sequelize.query(
      "SELECT id, `key` FROM roles WHERE `key` IN ('admin', 'manager')"
    );
    const admin = roles.find((role) => role.key === 'admin');
    const manager = roles.find((role) => role.key === 'manager');
    if (admin && manager) {
      await queryInterface.sequelize.query(
        'UPDATE users SET role_id = ? WHERE role_id = ?',
        { replacements: [admin.id, manager.id] }
      );
    }
    await queryInterface.bulkDelete('roles', { key: 'manager' });
  },
};
