function errorHandler(err, req, res, next) {
  console.error("An error occurred:", err.message);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    data: null,
    error: err.message || 'Internal Server Error'
  });
}

module.exports = errorHandler;