import express from 'express';
const router = express.Router();

import ctrl from '../controllers/purchase-transaction.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/purchase-transaction.validator.js';

router.post('/', auth(["Admin", "Accountant"]), validator.createPurchaseTransaction(), validate, ctrl.create);

router.get('/', auth(["Admin", "Accountant"]) , ctrl.findAll);
router.get('/:id', auth(["Admin", "Accountant"]), ctrl.findById);

router.put('/:id', auth(["Admin", "Accountant"]), validator.updatePurchaseTransaction(), validate, ctrl.update);
router.delete('/:id', auth("Admin"), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;