import { body, param } from 'express-validator';

export default class PaymentValidator {
  static createPayment() {
    return [
      body('invoice_id').isMongoId(),
      body('method').isString().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('amount').isFloat({ gt: 0 }),
      body('date').isISO8601().toDate()
    ];
  }

  static updatePayment() {
    return [
      param('id').isMongoId(),
      body('amount').optional().isFloat({ gt: 0 })
    ];
  }
}