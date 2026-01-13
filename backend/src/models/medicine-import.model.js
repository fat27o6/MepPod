import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const medicineImportSchema = new Schema({
  medicine_id: { type: Schema.Types.ObjectId, ref: 'Medicine' },
  supplier: String,
  batchcode: String,
  quantity: Number,
  remaining: Number,
  unit_price: Number,
  expiry_date: Date,
  import_date: Date,
  imported_by: { type: Schema.Types.ObjectId, ref: 'Employee' },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

export default mongoose.model('MedicineImport', medicineImportSchema);