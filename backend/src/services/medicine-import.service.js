import mongoose from 'mongoose';

import Medicine from '../models/medicine.model.js';
import MedicineImport from '../models/medicine-import.model.js';
import Employee from '../models/employee.model.js';
import dao from '../dao/medicine-import.dao.js';

class MedicineImportService {
  static async importWithTransaction({ imports, user }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      const seenInFile = new Set();
      const normalize = (s = "") =>
        String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      for (const importData of imports) {
        try {
          // ========= VALIDATE =========
          if (!importData.medicineName) throw new Error(`Tên thuốc không được để trống (dòng ${importData.rowNumber})`);
          if (!importData.supplier) throw new Error(`Nhà cung cấp không được để trống (dòng ${importData.rowNumber})`);
          if (!importData.batchcode) throw new Error(`Mã lô không được để trống (dòng ${importData.rowNumber})`);
          if (!importData.quantity || importData.quantity <= 0)
            throw new Error(`Số lượng phải > 0 (dòng ${importData.rowNumber})`);
          if (!importData.unit_price || importData.unit_price <= 0)
            throw new Error(`Giá nhập phải > 0 (dòng ${importData.rowNumber})`);

          // ========= DUPLICATE TRONG FILE =========
          const key = `${normalize(importData.medicineName)}|${normalize(importData.supplier)}`;
          if (seenInFile.has(key)) {
            results.skipped++;
            continue;
          }
          seenInFile.add(key);

          // ========= FIND / CREATE MEDICINE =========
          let medicine = await Medicine.findOne({
            name: new RegExp(`^${importData.medicineName}$`, 'i'),
            disabled: false
          }).session(session);

          if (!medicine) {
            if (!importData.unit || !importData.price) {
              throw new Error(`Thiếu thông tin tạo thuốc mới (dòng ${importData.rowNumber})`);
            }

            medicine = await Medicine.create([{
              name: importData.medicineName,
              category: importData.category || [],
              unit: importData.unit,
              price: importData.price,
              disabled: false
            }], { session });

            medicine = medicine[0];
          }

          // ========= FIND EMPLOYEE =========
          let importedBy = user?.employee_id || null;
          if (importData.importerName) {
            const emp = await Employee.findOne({
              fullname: importData.importerName
            }).session(session);

            if (!emp) {
              throw new Error(`Không tìm thấy người nhập (dòng ${importData.rowNumber})`);
            }
            importedBy = emp._id;
          }

          // ========= DUPLICATE TRONG DB =========
          const existed = await MedicineImport.findOne({
            medicine_id: medicine._id,
            supplier: new RegExp(`^${importData.supplier}$`, 'i'),
            disabled: false
          }).session(session);

          if (existed) {
            results.skipped++;
            continue;
          }

          // ========= CREATE IMPORT =========
          await dao.create({
            medicine_id: medicine._id,
            supplier: importData.supplier,
            batchcode: importData.batchcode,
            quantity: importData.quantity,
            remaining: importData.quantity,
            unit_price: importData.unit_price,
            expiry_date: importData.expiry_date,
            import_date: importData.import_date,
            imported_by: importedBy
          }, session);

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            row: importData.rowNumber,
            medicine: importData.medicineName,
            error: err.message
          });
        }
      }

      await session.commitTransaction();
      return results;

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default MedicineImportService;