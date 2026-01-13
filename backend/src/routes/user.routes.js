import express from 'express';
const router = express.Router();

import ctrl from '../controllers/user.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/user.validator.js';

router.post('/', auth("Admin"), validator.createUser(), validate, ctrl.create);

router.get('/', auth("Admin"), ctrl.findAll);
router.get('/:id', auth(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant', 'Pharmacist']), ctrl.findById);

router.patch('/changepass/:id', auth(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant', 'Pharmacist']), ctrl.changepass);
router.put('/:id', auth("Admin"), validator.updateUser(), validate, ctrl.update);
router.delete('/:id', auth("Admin"), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;