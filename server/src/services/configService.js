import { query } from '../db/index.js';

let cachedConfig = {
  aging_threshold_minutes: 5,
  freshness_threshold_minutes: 15,
  max_simultaneous_cleanings: 3,
  target_coordination_time_minutes: 60
};

export const loadSystemConfig = async () => {
  try {
    const rows = await query('SELECT * FROM system_settings');
    if (rows && rows.length > 0) {
      for (const row of rows) {
        const val = Number(row.setting_value);
        if (!isNaN(val)) {
          cachedConfig[row.setting_key] = val;
        }
      }
    }
  } catch (err) {
    // If DB is not yet initialized (e.g. unit tests without DB), use defaults
  }
  return cachedConfig;
};

export const getSystemConfig = () => cachedConfig;

export const updateSystemConfigCache = (key, value) => {
  const val = Number(value);
  if (!isNaN(val)) {
    cachedConfig[key] = val;
  }
};
