const mongoSanitize = require("express-mongo-sanitize");

// express-mongo-sanitize's default middleware assigns back to req.query,
// but in some configurations (e.g. Express 5) `req.query` is a getter-only
// property. Reassigning it triggers the "Cannot set property query of
// #<IncomingMessage>" error. We wrap the sanitizer and handle `query` in-place.

module.exports = function sanitizedMiddleware(options = {}) {
  // prepare the underlying sanitizer functions
  const sanitizeObj = mongoSanitize.sanitize;

  return function (req, res, next) {
    try {
      ["body", "params", "headers"].forEach((key) => {
        if (req[key]) {
          req[key] = sanitizeObj(req[key], options);
        }
      });

      if (req.query) {
        // sanitize a shallow copy then merge back into original object
        const sanitized = sanitizeObj({ ...req.query }, options);
        // clear original
        Object.keys(req.query).forEach((k) => delete req.query[k]);
        Object.assign(req.query, sanitized);
      }

      next();
    } catch (err) {
      // If the error is the specific query setter issue, ignore and continue
      if (
        err instanceof TypeError &&
        err.message &&
        err.message.includes("Cannot set property query")
      ) {
        // fallback: simply don't try to replace req.query
        return next();
      }
      next(err);
    }
  };
};
