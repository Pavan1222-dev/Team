
function errorHandler(err, req, res, next) {
  console.error(err);

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.details.map((item) => ({
        field: item.path.join("."),
        message: item.message
      }))
    });
  }

  // Duplicate ISBN or email
  if (
    err.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    err.code === "SQLITE_CONSTRAINT_PRIMARYKEY"
  ) {
    return res.status(409).json({
      success: false,
      error: "A record with this unique value already exists"
    });
  }

  // Cannot delete a referenced book or member
  if (err.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return res.status(409).json({
      success: false,
      error: "Cannot delete this record because loan records reference it"
    });
  }

  const status = err.status || 500;

  return res.status(status).json({
    success: false,
    error: status === 500
      ? "Internal server error"
      : err.message
  });
}

module.exports = errorHandler;
