import Invoice from '../models/invoice.model.js';
import BaseDAO from './base.dao.js';

class InvoiceDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(Invoice);
  }

  async findAll(filter = {}) {
    if (filter.disabled === undefined) {
      filter.disabled = false;
    }
    return await this.model.find(filter)
      .populate('patient_id', 'fullname phone email dob gender address')
      .populate('appointment_id', 'appointment_date status reason')
      .sort({ created_at: -1 })
      .exec();
  }

  async findById(id) {
    return await this.model.findOne({ _id: id, disabled: false })
      .populate('patient_id', 'fullname phone email dob gender address')
      .populate('appointment_id', 'appointment_date status reason')
      .exec();
  }

  async findByPatientId(id) {
    return await this.model.find({ patient_id: id, disabled: false })
      .populate('appointment_id', 'appointment_date status reason')
      .populate('patient_id', 'fullname phone email dob gender address')
      .sort({ created_at: -1 })
      .exec();
  }
}

export default new InvoiceDAO()