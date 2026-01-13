import Appointment from '../models/appointment.model.js';
import BaseDAO from './base.dao.js';

class AppointmentDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(Appointment);
  }

  async findDoctorAppoint(doctor_id) {
    return this.model.find({
      doctor_id,
      disabled: false
    });
  }

  async findPatientAppoint(patient_id) {
    return this.model.find({
      patient_id,
      disabled: false
    });
  }
}

export default new AppointmentDAO()