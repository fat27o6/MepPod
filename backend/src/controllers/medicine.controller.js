import XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

import dao from '../dao/medicine.dao.js';
import MedicineImport from '../models/medicine-import.model.js';
import MedicineService from '../services/medicine.service.js';

class MedicineController {
  async create(req, res) {
    try {
      const result = await dao.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findAll(req, res) {
    try {
      const filter = {};
      if (req.query.disabled !== undefined) {
        filter.disabled = req.query.disabled === 'true';
      }
      const result = await dao.findAll(filter);

      // Tính số lượng còn lại cho mỗi thuốc từ medicine imports
      const medicinesWithInventory = await Promise.all(
        result.map(async (medicine) => {
          const medicineId = medicine._id;

          const inventory = await MedicineImport.aggregate([
            {
              $match: {
                medicine_id: medicineId,
                disabled: false,
                remaining: { $gt: 0 }
              }
            },
            {
              $group: {
                _id: null,
                total_remaining: { $sum: '$remaining' }
              }
            }
          ]);

          const totalRemaining = inventory.length > 0 ? inventory[0].total_remaining : 0;

          return {
            ...medicine,
            total_remaining: totalRemaining
          };
        })
      );

      res.json(medicinesWithInventory);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findById(req, res) {
    try {
      const result = await dao.findById(req.params.id);
      if (!result) return res.status(404).json({ message: 'Not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async update(req, res) {
    try {
      const result = await dao.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async remove(req, res) {
    try {
      await MedicineService.deleteCascade(req.params.id);
      res.json({ message: 'Deleted with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async restore(req, res) {
    try {
      await MedicineService.restoreCascade(req.params.id);
      res.json({ message: 'Medicine restore with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // Kế thừa
  async bulkDelete(req, res) {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body && req.body.ids ? req.body.ids : []);
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No ids provided' });
      }

      if (req.query && req.query.hard === 'true') {
        if (typeof dao.hardDeleteMany === 'function') {
          await dao.hardDeleteMany(ids);
          return res.json({ message: 'Permanently deleted' });
        } else {
          for (const id of ids) {
            await dao.hardDelete(id);
          }
          return res.json({ message: 'Permanently deleted' });
        }
      }

      if (typeof dao.deleteMany === 'function') {
        await dao.deleteMany(ids);
      } else {
        for (const id of ids) {
          await dao.delete(id);
        }
      }
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async import(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Không có file được upload' });
      }

      const file = req.file;
      let medicines = [];

      // Hàm chuẩn hóa key header: bỏ dấu tiếng Việt, khoảng trắng, ký tự đặc biệt, về lowercase
      const normalizeKey = (key = "") =>
        String(key)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      // Xử lý file Excel (.xlsx, .xls)
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Đọc dạng mảng 2D để tự xác định dòng header, bỏ qua dòng tiêu đề như "DỮ LIỆU IMPORT..."
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        if (rows.length === 0) {
          return res.status(400).json({ error: 'File không chứa dữ liệu hợp lệ' });
        }

        // Tìm dòng header: có ít nhất cột tên thuốc + đơn vị + giá
        let headerRowIndex = -1;
        let fallbackHeaderIndex = -1; // dùng khi không match được theo tên cột
        let colIndex = {
          name: -1,
          category: -1,
          unit: -1,
          price: -1,
        };

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;

          // Ghi nhận dòng đầu tiên có dữ liệu làm fallback header (trong trường hợp header bị merge ô, khó nhận dạng)
          const hasAnyValue = row.some((cell) => String(cell || "").trim() !== "");
          if (hasAnyValue && fallbackHeaderIndex === -1) {
            fallbackHeaderIndex = i;
          }

          row.forEach((cell, idx) => {
            const norm = normalizeKey(String(cell || ""));
            if (norm.includes("tenthuoc") || norm.includes("ten") || norm.includes("name")) {
              if (colIndex.name === -1) colIndex.name = idx;
            }
            if (norm.includes("danhmuc") || norm.includes("category")) {
              if (colIndex.category === -1) colIndex.category = idx;
            }
            if (norm.includes("donvi") || norm.includes("unit")) {
              if (colIndex.unit === -1) colIndex.unit = idx;
            }
            if (norm.includes("gia") || norm.includes("price")) {
              if (colIndex.price === -1) colIndex.price = idx;
            }
          });

          // Xác nhận header hợp lệ nếu có ít nhất name, unit và price
          if (
            colIndex.name !== -1 &&
            colIndex.unit !== -1 &&
            colIndex.price !== -1
          ) {
            headerRowIndex = i;
            break;
          }
        }

        // Nếu không tìm được header theo tên cột → fallback sang dòng đầu tiên có dữ liệu và giả định thứ tự cột: tên, danh mục, đơn vị, giá
        if (headerRowIndex === -1) {
          if (fallbackHeaderIndex !== -1) {
            headerRowIndex = fallbackHeaderIndex;
            colIndex = {
              name: 0,
              category: 1,
              unit: 2,
              price: 3,
            };
            console.warn(
              "⚠️ Không nhận diện được header theo tên cột, dùng fallback header tại dòng",
              headerRowIndex,
              "với mapping mặc định (name, category, unit, price)"
            );
          } else {
            console.error("Không tìm thấy dòng header hợp lệ trong file Excel");
            return res.status(400).json({
              error:
                "Không tìm thấy dòng tiêu đề (header) hợp lệ. Vui lòng kiểm tra lại file Excel theo đúng cấu trúc mẫu.",
            });
          }
        }

        console.log("📄 Medicine import header row index:", headerRowIndex);
        console.log("📄 Medicine column index:", colIndex);

        // Từ dòng sau header trở đi là data
        medicines = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;

          const name = (colIndex.name !== -1 ? row[colIndex.name] : "") || "";
          const categoryStr = (colIndex.category !== -1 ? row[colIndex.category] : "") || "";
          const unit = (colIndex.unit !== -1 ? row[colIndex.unit] : "") || "";
          const priceRaw = (colIndex.price !== -1 ? row[colIndex.price] : "") || 0;

          // Xử lý category: có thể là string hoặc string phân cách bởi dấu phẩy
          let categories = [];
          if (categoryStr) {
            categories = String(categoryStr).split(',').map(c => c.trim()).filter(c => c);
            // Giới hạn tối đa 3 danh mục
            if (categories.length > 3) {
              categories = categories.slice(0, 3);
            }
          }

          // Xử lý giá: loại bỏ dấu phẩy/phẩy chấm phân cách hàng nghìn và parse
          let price = 0;
          if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '') {
            // Nếu đã là số thì dùng luôn
            if (typeof priceRaw === 'number') {
              price = priceRaw;
            } else {
              // Chuyển sang string và loại bỏ các ký tự không phải số (trừ dấu chấm cho số thập phân)
              const priceStr = String(priceRaw).trim();
              // Loại bỏ dấu phẩy phân cách hàng nghìn (ví dụ: 42,000 -> 42000)
              // Loại bỏ khoảng trắng và các ký tự đặc biệt
              const cleanedPrice = priceStr.replace(/,/g, '').replace(/\s/g, '').replace(/[^\d.]/g, '');
              price = parseFloat(cleanedPrice) || 0;
            }
          }

          // Bỏ qua các dòng trống hoàn toàn
          if (!name && !unit && !price) {
            continue;
          }

          medicines.push({
            name: String(name).trim(),
            category: categories,
            unit: String(unit).trim(),
            price: price,
            // i là index 0-based trong sheet, +1 để ra số dòng thực tế trong Excel
            rowNumber: i + 1
          });
        }
      }
      // Xử lý file CSV
      else if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const records = parse(file.buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        medicines = records.map((row, index) => {
          const name = row['Tên thuốc'] || row['Tên'] || row['name'] || row['Name'] || '';
          const categoryStr = row['Danh mục'] || row['Category'] || row['category'] || '';
          const unit = row['Đơn vị'] || row['Unit'] || row['unit'] || '';

          // Tìm giá với nhiều tên cột có thể - tìm trong tất cả keys
          let priceRaw = 0;
          const priceKeys = ['Giá', 'Giá (VNĐ)', 'Giá(VNĐ)', 'Price', 'price', 'Gia', 'gia', 'GIA'];
          for (const key of priceKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              priceRaw = row[key];
              break;
            }
          }

          // Nếu không tìm thấy, tìm trong tất cả keys có chứa "giá" hoặc "price"
          if (!priceRaw || priceRaw === 0) {
            const allKeys = Object.keys(row);
            const priceKey = allKeys.find(key =>
              key.toLowerCase().includes('giá') ||
              key.toLowerCase().includes('price') ||
              key.toLowerCase().includes('gia')
            );
            if (priceKey) {
              priceRaw = row[priceKey];
            }
          }

          let categories = [];
          if (categoryStr) {
            categories = categoryStr.split(',').map(c => c.trim()).filter(c => c);
            if (categories.length > 3) {
              categories = categories.slice(0, 3);
            }
          }

          // Xử lý giá: loại bỏ dấu phẩy/phẩy chấm phân cách hàng nghìn và parse
          let price = 0;
          if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '') {
            // Nếu đã là số thì dùng luôn
            if (typeof priceRaw === 'number') {
              price = priceRaw;
            } else {
              // Chuyển sang string và loại bỏ các ký tự không phải số (trừ dấu chấm cho số thập phân)
              const priceStr = String(priceRaw).trim();
              // Loại bỏ dấu phẩy phân cách hàng nghìn (ví dụ: 42,000 -> 42000)
              // Loại bỏ khoảng trắng và các ký tự đặc biệt
              const cleanedPrice = priceStr.replace(/,/g, '').replace(/\s/g, '').replace(/[^\d.]/g, '');
              price = parseFloat(cleanedPrice) || 0;
            }
          }

          return {
            name: String(name).trim(),
            category: categories,
            unit: String(unit).trim(),
            price: price,
            rowNumber: index + 2
          };
        });
      } else {
        return res.status(400).json({ error: 'Định dạng file không được hỗ trợ. Vui lòng sử dụng file Excel (.xlsx, .xls) hoặc CSV (.csv)' });
      }

      // GỌI SERVICE
      const result = await MedicineService.importMedicines(medicines);

      res.json({
        message: `Import hoàn tất: ${result.success} thành công, ${result.failed} thất bại, ${result.skipped} bỏ qua`,
        success: result.success,
        failed: result.failed,
        skipped: result.skipped,
        errors: result.errors,
        ...result
      });
    } catch (err) {
      console.error('Import error:', err);
      res.status(500).json({ error: err.message || 'Lỗi khi import file' });
    }
  };
  //
}

export default new MedicineController();