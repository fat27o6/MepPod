import express from 'express';
const router = express.Router();

import ctrl from '../controllers/vnpay.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import { body } from 'express-validator';

// Kế thừa
router.post(
    '/vnpay/create',
    auth(['Admin', 'Accountant']),
    [
        body('invoice_id').isMongoId().withMessage('Invoice ID không hợp lệ'),
        body('bankCode').optional().isString(),
    ],
    validate,
    ctrl.createPaymentUrl
);
//

router.get('/vnpay-return', ctrl.returnUrl);
router.get('/vnpay-ipn', ctrl.ipnUrl);
router.post('/vnpay-ipn', ctrl.ipnUrl);

export default router;