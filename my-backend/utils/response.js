// Standardized API response helper functions

// Success response
const success = (res, data = null, message = "Success", statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// Error response
const error = (
  res,
  message = "Error occurred",
  statusCode = 500,
  errors = null
) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Paginated response
const paginated = (res, data, page, limit, total, message = "Success") => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      current_page: page,
      per_page: limit,
      total_items: total,
      total_pages: totalPages,
      has_next: hasNext,
      has_prev: hasPrev,
    },
    timestamp: new Date().toISOString(),
  });
};

// Created response
const created = (res, data, message = "Resource created successfully") => {
  return success(res, data, message, 201);
};

// No content response
const noContent = (res, message = "No content") => {
  return res.status(204).json({
    success: true,
    message,
    timestamp: new Date().toISOString(),
  });
};

// Not found response
const notFound = (res, message = "Resource not found") => {
  return error(res, message, 404);
};

// Unauthorized response
const unauthorized = (res, message = "Unauthorized access") => {
  return error(res, message, 401);
};

// Forbidden response
const forbidden = (res, message = "Access forbidden") => {
  return error(res, message, 403);
};

// Bad request response
const badRequest = (res, message = "Bad request", errors = null) => {
  return error(res, message, 400, errors);
};

// Internal server error response
const serverError = (res, message = "Internal server error") => {
  return error(res, message, 500);
};

const validationError = (res, errors, message = "Validation failed") => {
  return error(res, message, 422, errors);
};

module.exports = {
  success,
  error,
  paginated,
  created,
  noContent,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  validationError,
};
