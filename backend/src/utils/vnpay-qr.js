import crypto from 'crypto';
import qs from 'qs';
import moment from 'moment-timezone';

/**
 * VNPay QR Code Utility
 * Tạo QR code cho thanh toán VNPay
 */
class VNPayQR {
    constructor() {
        // Load config từ environment variables
        this.tmnCode = process.env.VNPAY_TMN_CODE || '';
        this.hashSecret = process.env.VNPAY_HASH_SECRET || '';
        this.paymentUrl = process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        this.returnUrl = process.env.VNPAY_RETURN_URL || `https://clinic-system-manager.vercel.app/dashboard/invoices/[invoice_id]`;
        this.ipnUrl = process.env.VNPAY_IPN_URL || `https://meppod.onrender.com/api/payments/vnpay-ipn`;

        console.log('🔧 VNPay QR Config:', {
            hasTmnCode: !!this.tmnCode,
            hasHashSecret: !!this.hashSecret,
            paymentUrl: this.paymentUrl
        });
    }

    /**
     * Tạo QR code data cho VNPay payment
     * @param {Object} params - Thông tin đơn hàng
     * @param {string} params.orderId - Mã đơn hàng (invoice_id)
     * @param {number} params.amount - Số tiền (VND)
     * @param {string} params.orderDescription - Mô tả đơn hàng
     * @returns {Object} QR code data
    */
    createQRCodeData(params) {
        // Kiểm tra config
        if (!this.tmnCode || !this.hashSecret) {
            throw new Error('VNPay chưa được cấu hình. Vui lòng kiểm tra VNPAY_TMN_CODE và VNPAY_HASH_SECRET trong file .env');
        }

        const {
            orderId,
            amount,
            orderDescription = 'Thanh toan hoa don',
        } = params;

        if (!orderId || !amount) {
            throw new Error('Thiếu thông tin orderId hoặc amount');
        }

        // Use Asia/Ho_Chi_Minh timezone
        const now = moment().tz('Asia/Ho_Chi_Minh');
        const createDate = now.format('YYYYMMDDHHmmss');
        const expireDate = now.clone().add(15, 'minutes').format('YYYYMMDDHHmmss');

        // Validate và format orderId
        let vnp_TxnRef = orderId.toString().replace(/[^a-zA-Z0-9_]/g, '').substring(0, 100);
        if (!vnp_TxnRef) {
            vnp_TxnRef = `ORDER_${Date.now()}`;
        }

        // Validate orderDescription
        let vnp_OrderInfo = orderDescription.substring(0, 255);
        vnp_OrderInfo = vnp_OrderInfo.replace(/[<>\"'&]/g, '');

        // Validate amount
        const vnp_Amount = Math.floor(Number(amount) * 100);
        if (isNaN(vnp_Amount) || vnp_Amount <= 0) {
            throw new Error('Amount không hợp lệ');
        }

        // Tạo QR code params
        const qrParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: this.tmnCode,
            vnp_Amount: vnp_Amount.toString(),
            vnp_CurrCode: 'VND',
            vnp_TxnRef: vnp_TxnRef,
            vnp_OrderInfo: vnp_OrderInfo,
            vnp_OrderType: 'other',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: this.returnUrl,
            vnp_IpAddr: '127.0.0.1',
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate,
        };

        // Sort params
        const sortedParams = this.sortObject(qrParams);

        // Tạo signData
        const signData = Object.keys(sortedParams)
            .sort()
            .map(key => `${key}=${sortedParams[key]}`)
            .join('&');

        // Tạo signature
        const hmac = crypto.createHmac('sha512', this.hashSecret);
        const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // Thêm signature vào params
        sortedParams.vnp_SecureHash = signature;

        // Tạo QR string
        const qrString = Object.keys(sortedParams)
            .sort()
            .map(key => `${key}=${sortedParams[key]}`)
            .join('&');

        const paymentUrl = this.paymentUrl + '?' + qs.stringify(sortedParams, { encode: false });

        console.log('🔗 VNPay QR Code created:', {
            orderId: vnp_TxnRef,
            amount: vnp_Amount / 100,
            qrLength: qrString.length
        });

        return {
            qrData: qrString,
            paymentUrl: paymentUrl,
            orderId: vnp_TxnRef,
            amount: vnp_Amount / 100,
            expireDate: expireDate
        };
    }

    // Sort object by key
    sortObject(obj) {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        keys.forEach(key => {
            const value = obj[key];
            const encoded = encodeURIComponent(value).replace(/%20/g, '+');
            sorted[key] = encoded;
        });
        return sorted;
    }
}

export default new VNPayQR();
