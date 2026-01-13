import express from 'express';
const router = express.Router();

import ctrl from '../controllers/patient.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/patient.validator.js';

router.post('/', auth(["Admin", "Receptionist"]), validator.createPatient(), validate, ctrl.create);

router.get('/', auth(process.env.ALLROLE) , ctrl.findAll);
router.get('/:id', auth(process.env.ALLROLE), ctrl.findById);

router.put('/:id', auth(["Admin", "Receptionist"]), validator.updatePatient(), validate, ctrl.update);
router.delete('/:id', auth("Admin"), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;