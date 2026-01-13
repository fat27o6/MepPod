import Patient from '../models/patient.model.js';
import BaseDAO from './base.dao.js';

class PatientDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(Patient);
  }
}

export default new PatientDAO()