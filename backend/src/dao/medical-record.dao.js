import MedicalRecord from '../models/medical-record.model.js';
import BaseDAO from './base.dao.js';

class MedicalRecordDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(MedicalRecord);
  }

  async findAll(filter = {}) {
    if (filter.disabled === undefined) {
      filter.disabled = false;
    }
    return await this.model.find(filter)
      .populate('doctor_id', 'fullname')
      .populate('appointment_id')
      .populate('patient_id')
      .populate('prescriptions.medicine_id', 'name unit price')
      .sort({ created_at: -1 })
      .exec();
  }

  async findByPatientId(patient_id) {
    return await this.model.find({ patient_id, disabled: false })
      .populate('doctor_id', 'fullname')
      .populate('appointment_id')
      .populate('patient_id')
      .populate('prescriptions.medicine_id', 'name unit price')
      .sort({ created_at: -1 })
      .exec();
  }
}

export default new MedicalRecordDAO()