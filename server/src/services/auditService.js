import { run } from '../db/index.js';

/**
 * Log action into audit_logs table.
 */
export const logAudit = async ({
  userRole = 'system',
  userName = 'System Engine',
  action,
  targetType,
  targetId,
  previousState = null,
  newState = null,
  reason = ''
}) => {
  try {
    const timestamp = new Date().toISOString();
    await run(
      `INSERT INTO audit_logs (timestamp, user_role, user_name, action, target_type, target_id, previous_state, new_state, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [timestamp, userRole, userName, action, targetType, targetId, previousState, newState, reason]
    );
  } catch (err) {
    console.error('Audit log failure:', err.message);
  }
};
