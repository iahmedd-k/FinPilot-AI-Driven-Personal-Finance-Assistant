/**
 * Evaluates a set of user transaction rules against a transaction object.
 * Mutates the transaction object if matches are found.
 * 
 * @param {Object} transaction - The transaction object (Mongoose document or raw object)
 * @param {Array} rules - Array of user-defined rules
 * @returns {Boolean} - Returns true if the transaction was modified, false otherwise
 */
const applyTransactionRules = (transaction, rules) => {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return false;
  }

  let modified = false;

  for (const rule of rules) {
    if (!rule.conditions || !Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      continue;
    }

    // A rule matches if ALL its conditions are met (AND logic)
    const matchesAll = rule.conditions.every(cond => {
      const field = String(cond.field || "").trim().toLowerCase();
      const operator = String(cond.operator || "").trim().toLowerCase();
      const condVal = String(cond.value || "").trim();

      // Retrieve the value from transaction. Fallback to empty string if undefined.
      let txVal = transaction[field];
      if (txVal === undefined || txVal === null) {
        txVal = "";
      }

      if (field === "amount") {
        const txNum = Number(txVal);
        const condNum = Number(condVal);
        if (isNaN(txNum) || isNaN(condNum)) return false;

        switch (operator) {
          case "equals":
            return txNum === condNum;
          case "greater_than":
            return txNum > condNum;
          case "less_than":
            return txNum < condNum;
          default:
            return false;
        }
      }

      // String-based fields
      const txStr = String(txVal).trim().toLowerCase();
      const condStr = condVal.toLowerCase();

      switch (operator) {
        case "equals":
          return txStr === condStr;
        case "contains":
          return txStr.includes(condStr);
        case "starts_with":
          return txStr.startsWith(condStr);
        case "ends_with":
          return txStr.endsWith(condStr);
        default:
          return false;
      }
    });

    if (matchesAll && rule.actions && Array.isArray(rule.actions)) {
      for (const action of rule.actions) {
        const field = String(action.field || "").trim(); // field name: e.g. category, tag, merchant, isHidden, reviewStatus
        const val = String(action.value || "").trim();

        if (field === "isHidden" || field === "isRecurring") {
          const boolVal = val === "true" || val === "hide";
          if (transaction[field] !== boolVal) {
            transaction[field] = boolVal;
            modified = true;
          }
        } else if (field === "category" || field === "tag" || field === "merchant" || field === "reviewStatus") {
          // If we are dealing with a Mongoose document or raw JS object
          if (transaction[field] !== val) {
            transaction[field] = val;
            modified = true;
          }
        }
      }
    }
  }

  return modified;
};

module.exports = { applyTransactionRules };
