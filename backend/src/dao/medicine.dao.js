import Medicine from '../models/medicine.model.js';
import BaseDAO from './base.dao.js';
import MedicineService from '../services/medicine.service.js';

class MedicineDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(Medicine);
  }

  async create(data, session = null) {
    if (session) {
      return this.model.create([data], { session });
    }
    return this.model.create(data);
  }

  async findAll(filter = {}) {
    if (filter.disabled === undefined) {
      filter.disabled = false;
    }
    return await this.model.find(filter).lean();
  }

  async deleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return null;
    return await MedicineService.deleteManyCascade(ids);
  }

  async hardDeleteMany(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return null;
    return await MedicineService.harDeleteManyCascade(ids);
  }
}

export default new MedicineDAO()