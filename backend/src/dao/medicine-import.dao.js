import MedicineImport from '../models/medicine-import.model.js';
import BaseDAO from './base.dao.js';

class MedicineImportDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(MedicineImport);
  }

  async create(data, session = null) {
    return this.model.create([data], session ? { session } : {});
  }


  async findAll(filter = {}) {
    if (filter.disabled === undefined) {
      filter.disabled = false;
    }
    
    const results = await this.model.find(filter)
      .populate({
        path: 'medicine_id',
        select: 'name category unit price',
        model: 'Medicine'
      })
      .populate({
        path: 'imported_by',
        select: 'fullname position',
        model: 'Employee'
      })
      .lean()
      .exec();
    return results;
  }

  async findById(id) {
    const result = await this.model.findById(id)
      .populate({
        path: 'medicine_id',
        select: 'name category unit price',
        model: 'Medicine'
      })
      .populate({
        path: 'imported_by',
        select: 'fullname position',
        model: 'Employee'
      })
      .lean()
      .exec();
    return result;
  }

  async create(data) {
    // Set remaining = quantity nếu không được cung cấp
    if (data.quantity && !data.remaining) {
      data.remaining = data.quantity;
    }
    const result = await this.model.create(data);
    const populated = await this.model.findById(result._id)
      .populate({
        path: 'medicine_id',
        select: 'name category unit price',
        model: 'Medicine'
      })
      .populate({
        path: 'imported_by',
        select: 'fullname position',
        model: 'Employee'
      })
      .lean()
      .exec();
    return populated;
  }

  async update(id, data) {
    const result = await this.model.findByIdAndUpdate(id, data, { new: true });
    if (result) {
      const populated = await this.model.findById(result._id)
        .populate({
          path: 'medicine_id',
          select: 'name category unit price',
          model: 'Medicine'
        })
        .populate({
          path: 'imported_by',
          select: 'fullname position',
          model: 'Employee'
        })
        .lean()
        .exec();
      return populated;
    }
    return result;
  }
}

export default new MedicineImportDAO()