// Use the same response shape when a URL does not exist.
export function notFoundHandler(request, _response, next) {
  const error = new Error("The requested route was not found.");
  error.status = 404;
  error.code = "NOT_FOUND";
  next(error);
}

// Convert application and database errors to one JSON response format.
export function errorHandler(error, _request, response, _next) {
  let status = error.status || 500;
  let code = error.code || "SERVER_ERROR";
  let message = error.message || "Something went wrong.";

  // SQLite reports duplicate ISBNs and emails as unique constraints.
  if (error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      (error.message && error.message.includes("UNIQUE constraint failed"))) {
    status = 409;
    code = "DUPLICATE";
    message = "That ISBN or email is already in use.";
  } else if (error.message && error.message.includes("FOREIGN KEY constraint failed")) {
    status = 409;
    code = "IN_USE";
    message = "This record is used by a loan and cannot be deleted.";
  }

  // Do not send internal database details to API users.
  if (status >= 500) {
    console.error(error);
    message = "Something went wrong.";
  }

  response.status(status).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      details: error.details || null
    }
  });
}