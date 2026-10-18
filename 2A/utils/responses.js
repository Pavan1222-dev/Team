export function successResponse(data) {
  return { success: true, data, error: null };
}

export function errorResponse(message, details = null) {
  return { success: false, data: null, error: { message, details } };
}
