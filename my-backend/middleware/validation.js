const { body, param, query, validationResult } = require('express-validator');

// Handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Venue validation rules
const validateVenue = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Venue name must be between 2 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('venue_type')
    .isIn(['sports', 'entertainment', 'both'])
    .withMessage('Venue type must be sports, entertainment, or both'),
  body('location')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Location must be between 5 and 500 characters'),
  body('capacity')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Capacity must be between 1 and 100,000'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('contact_phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('contact_email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid contact email'),
  handleValidationErrors
];

// Blog validation rules
const validateBlog = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Title must be between 5 and 300 characters'),
  body('content')
    .trim()
    .isLength({ min: 50, max: 10000 })
    .withMessage('Content must be between 50 and 10,000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('is_published')
    .optional()
    .isBoolean()
    .withMessage('is_published must be a boolean'),
  handleValidationErrors
];

// Partner validation rules
const validatePartner = [
  body('company_name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),
  body('contact_person')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('partnership_type')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Partnership type must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  handleValidationErrors
];

// Review validation rules
const validateReview = [
  body('entity_type')
    .isIn(['venue', 'blog', 'partner'])
    .withMessage('Entity type must be venue, blog, or partner'),
  body('entity_id')
    .notEmpty()
    .withMessage('Entity ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Comment must be between 5 and 1000 characters'),
  handleValidationErrors
];

// Contact validation rules
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  handleValidationErrors
];

// Appointment validation rules
const validateAppointment = [
  body('venue_id')
    .notEmpty()
    .withMessage('Venue ID is required'),
  body('appointment_date')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Appointment date must be in the future');
      }
      return true;
    }),
  body('duration_hours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Duration must be between 1 and 24 hours'),
  body('purpose')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Purpose must be between 5 and 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors
];

// Appointment status validation
const validateAppointmentStatus = [
  body('status')
    .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    .withMessage('Status must be pending, confirmed, cancelled, or completed'),
  handleValidationErrors
];

// Parameter validation
const validateObjectId = [
  param('id')
    .notEmpty()
    .withMessage('ID parameter is required'),
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateVenue,
  validateBlog,
  validatePartner,
  validateReview,
  validateContact,
  validateAppointment,
  validateAppointmentStatus,
  validateObjectId,
  validatePagination,
  handleValidationErrors
};