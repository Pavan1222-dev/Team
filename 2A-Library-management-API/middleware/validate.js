function validateBody(zodSchema) {
  return function(req, res, next) {
    try {
      req.body = zodSchema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        data: null,
        error: error.errors
      }); 
    }
  };
}

module.exports = validateBody;