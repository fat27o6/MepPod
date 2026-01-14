import { body, param } from 'express-validator';

export default class MedicineValidator {
  static createMedicine() {
    return [
      body('name').isString().notEmpty().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('category').optional().isArray(),
      body('category.*').optional().isString().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('unit').isString(),
      body('price').isFloat({ gt: 0 })
    ];
  }

  static updateMedicine() {
    return [
      param('id').isMongoId(),
      body('category').optional().isArray(),
      body('category.*').optional().isString().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('price').optional().isFloat({ gt: 0 })
    ];
  }
}