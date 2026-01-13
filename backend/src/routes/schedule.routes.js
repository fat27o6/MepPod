import express from 'express';
const router = express.Router();

import ctrl from '../controllers/schedule.controller.js';
import auth from '../../middleware/auth.middleware.js';

router.get('/', auth(["Admin", "Doctor", "Nurse", "Receptionist", "Accountant", "Pharmacist"]), ctrl.findAll);
router.get('/:employee_id', auth(["Admin", "Doctor", "Nurse", "Receptionist", "Accountant", "Pharmacist"]), ctrl.findByEmployeeId);

router.post('/', auth("Admin"), ctrl.create);

router.put('/:employee_id', auth("Admin"), ctrl.update);
router.delete('/:employee_id', auth("Admin"), ctrl.remove);

export default router;