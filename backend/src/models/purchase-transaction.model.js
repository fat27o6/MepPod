import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const purchaseTransactionSchema = new Schema({
  import_id: { type: Schema.Types.ObjectId, ref: 'MedicineImport' },
  payment_method: String,
  amount: Number,
  date: Date,
  accountant_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

export default mongoose.model('PurchaseTransaction', purchaseTransactionSchema);