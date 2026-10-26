// Check request data before a controller tries to use it.
export function validate(schema, source = "body") {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);

    // Send each invalid field and its message to the central error handler.
    if (!result.success) {
      const error = new Error("Request validation failed.");
      error.status = 400;
      error.code = "VALIDATION_ERROR";
      error.details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message
      }));
      return next(error);
    }

    // Save the checked data so controllers use validated values.
    if (!response.locals.validated) response.locals.validated = {};
    response.locals.validated[source] = result.data;
    return next();
  };
}