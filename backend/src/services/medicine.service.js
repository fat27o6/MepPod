import mongoose from 'mongoose';

import MedicineDAO from '../dao/medicine.dao.js';
import MedicineImportDAO from '../dao/medicine-import.dao.js';
import PurchaseTransactionDAO from '../dao/purchase-transaction.dao.js';

class MedicineService {
    async importMedicines(medicines) {
      const session = await mongoose.startSession();
      session.startTransaction();

      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };

      try {
        const normalizeName = (str = "") =>
          String(str)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

        const escapeRegex = (str = "") =>
          String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const seenNames = new Set();

        for (const medicine of medicines) {
          try {
            const normName = normalizeName(medicine.name);

            if (!normName || normName === normalizeName("Tên thuốc")) continue;

            if (!medicine.name || medicine.name.length < 2) {
              throw new Error(`Tên thuốc không hợp lệ (dòng ${medicine.rowNumber})`);
            }
            if (!medicine.unit) {
              throw new Error(`Đơn vị không được để trống (dòng ${medicine.rowNumber})`);
            }
            if (!medicine.price || medicine.price <= 0) {
              throw new Error(`Giá phải lớn hơn 0 (dòng ${medicine.rowNumber})`);
            }

            // Trùng trong file
            if (seenNames.has(normName)) {
              results.skipped++;
              results.errors.push({
                row: medicine.rowNumber,
                name: medicine.name,
                error: `Thuốc trùng trong file import`,
                type: "skipped",
              });
              continue;
            }
            seenNames.add(normName);

            // Trùng trong DB
            const existing = await MedicineDAO.model.findOne({
              name: { $regex: new RegExp(`^${escapeRegex(medicine.name)}$`, "i") },
              disabled: false,
            }).session(session);

            if (existing) {
              results.skipped++;
              results.errors.push({
                row: medicine.rowNumber,
                name: medicine.name,
                error: `Thuốc đã tồn tại trong hệ thống`,
                type: "skipped",
              });
              continue;
            }

            // CREATE
            await MedicineDAO.create({
              name: medicine.name,
              category: medicine.category,
              unit: medicine.unit,
              price: medicine.price,
            }, session);

            results.success++;
          } catch (err) {
            results.failed++;
            results.errors.push({
              row: medicine.rowNumber,
              name: medicine.name,
              error: err.message,
              type: "failed",
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

  async deleteCascade(medicineId, hard = false) {
    if (hard) {
      await MedicineImportDAO.model.deleteMany({ medicine_id: medicineId });
      await PurchaseTransactionDAO.model.deleteMany({ medicine_id: medicineId });
      return MedicineDAO.hardDelete(patientId);
    }

    await MedicineImportDAO.model.updateMany(
      { medicine_id: medicineId, disabled: false },
      { disabled: true }
    );

    await PurchaseTransactionDAO.model.updateMany(
      { medicine_id: medicineId, disabled: false },
      { disabled: true }
    );

    return MedicineDAO.delete(medicineId);
  }

  async deleteManyCascade(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return null;

    for (const id of ids) {
      await this.deleteCascade(id);
    }

    return { deleted: ids.length };
  }

  async hardDeleteManyCascade(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return null;

    for (const id of ids) {
      await this.deleteCascade(id, true);
    }

    return { deleted: ids.length };
  }

  async restoreCascade(medicineId) {
    await MedicineImportDAO.model.updateMany(
      { medicine_id: medicineId, disabled: true },
      { disabled: false }
    );

    await PurchaseTransactionDAO.model.updateMany(
      { medicine_id: medicineId, disabled: true },
      { disabled: false }
    );

    return MedicineDAO.restore(medicineId);
  }
}

export default new MedicineService();