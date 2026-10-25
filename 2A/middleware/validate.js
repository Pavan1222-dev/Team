
function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      convert: true
    });

    if (error) {
      return next(error);
    }

    req[property] = value;
    next();
  };
}

module.exports = validate;
