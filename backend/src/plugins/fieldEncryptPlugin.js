import { encryptField, decryptField } from '../utils/cryptoField.js';

export default function fieldEncryptPlugin(schema, options) {
  const fields = options.fields || [];
  const getKey = options.getKey;

  schema.pre('save', async function(next) {
    try {
      const key = await getKey();
      for (const f of fields) {
        if (!this.isModified(f)) continue;
        const val = this.get(f);
        if (val == null) continue;
        const enc = encryptField(val, key);
        this.set(f, enc);
      }
      next();
    } catch (err) { next(err); }
  });

  function decryptDoc(doc) {
    return (async () => {
      const key = await getKey();
      for (const f of fields) {
        const stored = doc.get ? doc.get(f) : doc[f];
        if (!stored || !stored.ciphertext) continue;
        try {
          const plain = decryptField(stored, key);
          if (doc.set) doc.set(f, plain);
          else doc[f] = plain;
        } catch (e) {
          console.error('Decrypt failed for field', f, e.message);
        }
      }
    })();
  }

  schema.post('init', function() { decryptDoc(this); });
  schema.post('findOne', function(doc) { if (doc) decryptDoc(doc); });
  schema.post('find', function(docs) { docs.forEach(d => decryptDoc(d)); });
}