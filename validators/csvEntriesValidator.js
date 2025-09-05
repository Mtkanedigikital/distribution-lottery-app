// ============================================================================
// File: validators/csvEntriesValidator.js
// Version: v0.1_001 (2025-08-31)
// ============================================================================
// Specifications:
// - CSVエントリーをバリデーション
// - 必須フィールドとデータ形式を確認
// - 複数エントリーに対応
// ============================================================================
// History (recent only):
// - 2025-08-31 (v0.1_001) : [add] 初版を公式ヘッダ形式に修正
// ============================================================================

const REQUIRED_FIELDS = ['name', 'email', 'ticketNumber'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEntry(entry) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!entry[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (entry.email && !EMAIL_REGEX.test(entry.email)) {
    errors.push('Invalid email format');
  }

  if (entry.ticketNumber && !Number.isInteger(Number(entry.ticketNumber))) {
    errors.push('Ticket number must be an integer');
  }

  return errors;
}

function validateEntries(entries) {
  const results = [];

  entries.forEach((entry, index) => {
    const errors = validateEntry(entry);
    results.push({
      index,
      entry,
      errors,
      isValid: errors.length === 0,
    });
  });

  return results;
}

module.exports = {
  validateEntry,
  validateEntries,
};
