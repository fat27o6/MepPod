import { validationResult } from 'express-validator';

export default (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg || err.message).join(', ');
    return res.status(400).json({
      error: errorMessages || 'Validation error',
      errors: errors.array()
    });
  }
  next();
};