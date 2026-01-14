import { body, param } from 'express-validator';

export default class PurchaseTransactionValidator {
  static createPurchaseTransaction() {
    return [
      body('import_id').isMongoId(),
      body('payment_method').isString().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('amount').isFloat({ gt: 0 }),
      body('date').isISO8601().toDate(),
      body('accountant_id').isMongoId()
    ];
  }

  static updatePurchaseTransaction() {
    return [
      param('id').isMongoId(),
      body('amount').optional().isFloat({ gt: 0 })
    ];
  }
}