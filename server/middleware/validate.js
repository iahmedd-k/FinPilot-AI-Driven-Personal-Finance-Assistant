const validate = (schema) => (req, res, next) => {
  try {
    const data = req.body;
    const result = schema.parse(data);
    // if parse succeeds, attach the validated data (optional) and continue
    req.body = result;
    next();
  } catch (err) {
    // zod throws a ZodError on validation failure
    return res.status(400).json({
      success: false,
      errors: err.errors || err.message,
    });
  }
};

module.exports = validate;
