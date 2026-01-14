import crypto from 'crypto';
import qs from 'qs';

// Kế thừa
/**
 * VNPay Utility
 * Hỗ trợ tạo payment URL và verify callback từ VNPay
*/
class VNPay {
    constructor() {
        // Không load config trong constructor vì dotenv có thể chưa được load
        // Sẽ load config khi cần sử dụng (lazy loading)
        this._configLoaded = false;
    }

    // Lazy load config - chỉ load khi cần sử dụng
    _loadConfig() {
        if (this._configLoaded) return;

        // Lấy config từ environment variables
        this.tmnCode = process.env.VNPAY_TMN_CODE || '';
        this.hashSecret = process.env.VNPAY_HASH_SECRET || '';
        this.paymentUrl = process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        // Sử dụng PORT từ env hoặc default 5050 (vì Mac thường conflict port 5000)
        // Return URL nên trỏ về backend trực tiếp để xử lý
        // Backend sẽ xử lý payment và redirect về frontend
        this.returnUrl = process.env.VNPAY_RETURN_URL || `https://meppod.onrender.com/api/payments/vnpay-return`;
        this.ipnUrl = process.env.VNPAY_IPN_URL || `https://meppod.onrender.com/api/payments/vnpay-ipn`;

        this._configLoaded = true;

        // Log config status (không log secret đầy đủ để bảo mật)
        console.log('🔧 VNPay Config Status:', {
            hasTmnCode: !!this.tmnCode,
            tmnCodePreview: this.tmnCode ? this.tmnCode.substring(0, 4) + '...' : 'MISSING',
            hasHashSecret: !!this.hashSecret,
            hashSecretPreview: this.hashSecret ? this.hashSecret.substring(0, 4) + '...' : 'MISSING',
            paymentUrl: this.paymentUrl,
            returnUrl: this.returnUrl,
            ipnUrl: this.ipnUrl
        });
    }

    /**
     * Tạo payment URL từ VNPay
     * @param {Object} params - Thông tin đơn hàng
     * @param {string} params.orderId - Mã đơn hàng (invoice_id)
     * @param {number} params.amount - Số tiền (VND)
     * @param {string} params.orderDescription - Mô tả đơn hàng
     * @param {string} params.orderType - Loại đơn hàng
     * @param {string} params.locale - Ngôn ngữ (vn/en)
     * @returns {string} Payment URL
    */
    createPaymentUrl(params) {
        // Load config nếu chưa load (lazy loading)
        this._loadConfig();

        // Kiểm tra config
        if (!this.tmnCode || !this.hashSecret) {
            throw new Error('VNPay chưa được cấu hình. Vui lòng kiểm tra VNPAY_TMN_CODE và VNPAY_HASH_SECRET trong file .env');
        }

        const {
            orderId,
            amount,
            orderDescription = 'Thanh toan hoa don',
            orderType = 'other',
            locale = 'vn',
        } = params;

        if (!orderId || !amount) {
            throw new Error('Thiếu thông tin orderId hoặc amount');
        }

        const date = new Date();
        const createDate = this.formatDate(date);
        const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000)); // 15 phút

        // Validate và format orderId (vnp_TxnRef)
        // VNPay yêu cầu: max 100 ký tự, chỉ chứa chữ số, chữ cái, dấu gạch dưới
        let vnp_TxnRef = orderId.toString().replace(/[^a-zA-Z0-9_]/g, '').substring(0, 100);
        if (!vnp_TxnRef) {
            vnp_TxnRef = `ORDER_${Date.now()}`;
        }

        // Validate và format orderDescription (vnp_OrderInfo)
        // VNPay yêu cầu: max 255 ký tự
        // Lưu ý: VNPay có thể yêu cầu URL encoding, nhưng trong signData thì không encode
        let vnp_OrderInfo = orderDescription.substring(0, 255);
        // Loại bỏ ký tự đặc biệt có thể gây lỗi
        vnp_OrderInfo = vnp_OrderInfo.replace(/[<>\"'&]/g, '');

        // Validate amount - phải là số nguyên và chuyển sang string
        const vnp_Amount = Math.floor(Number(amount) * 100);
        if (isNaN(vnp_Amount) || vnp_Amount <= 0) {
            throw new Error('Amount không hợp lệ');
        }

        // Validate returnUrl - không được có placeholder
        let vnp_ReturnUrl = this.returnUrl;
        if (vnp_ReturnUrl.includes('[invoice_id]')) {
            // Nếu returnUrl có placeholder, thay bằng invoice_id thực tế
            vnp_ReturnUrl = vnp_ReturnUrl.replace('[invoice_id]', vnp_TxnRef);
        }

        // Tạo vnp_Params
        const vnp_Params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: this.tmnCode,
            vnp_Amount: vnp_Amount.toString(), // VNPay yêu cầu amount tính bằng xu (x100) và là string
            vnp_CurrCode: 'VND',
            vnp_TxnRef: vnp_TxnRef,
            vnp_OrderInfo: vnp_OrderInfo,
            vnp_OrderType: orderType,
            vnp_Locale: locale,
            vnp_ReturnUrl: vnp_ReturnUrl,
            vnp_IpAddr: '127.0.0.1',
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate,
        };

        // DEBUG: Log params trước khi xử lý
        console.log('📦 VNPay Params (raw):', {
            vnp_TxnRef: vnp_Params.vnp_TxnRef,
            vnp_TxnRefLength: vnp_Params.vnp_TxnRef.length,
            vnp_Amount: vnp_Params.vnp_Amount,
            vnp_OrderInfo: vnp_Params.vnp_OrderInfo,
            vnp_OrderInfoLength: vnp_Params.vnp_OrderInfo.length,
            vnp_ReturnUrl: vnp_Params.vnp_ReturnUrl,
            vnp_CreateDate: vnp_Params.vnp_CreateDate,
            vnp_ExpireDate: vnp_Params.vnp_ExpireDate,
        });

        // Thêm vnp_BankCode nếu có
        if (params.bankCode) {
            vnp_Params.vnp_BankCode = params.bankCode;
        }

        // Sắp xếp params theo thứ tự alphabet
        const sortedParams = this.sortObject(vnp_Params);

        // Tạo query string cho signData manually
        // Lưu ý: sortedParams đã được encode trong sortObject (và thay %20 bằng +)
        // Format: key1=encoded_value1&key2=encoded_value2&...
        const signData = Object.keys(sortedParams)
            .sort()
            .map(key => `${key}=${sortedParams[key]}`)
            .join('&');

        // DEBUG: Log data trước khi tạo signature
        console.log('📋 VNPay Request Data (before signature):');
        console.log('  signData:', signData);
        console.log('  params:', JSON.stringify(sortedParams, null, 2));
        console.log('  paramsCount:', Object.keys(sortedParams).length);

        // Tạo chữ ký - VNPay yêu cầu dùng Buffer.from()
        const hmac = crypto.createHmac('sha512', this.hashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // Thêm vnp_SecureHash vào params
        sortedParams.vnp_SecureHash = signed;

        // Tạo query string cuối cùng
        // Lưu ý: sortedParams đã được encode trong sortObject, nên dùng encode: false
        const finalQueryString = qs.stringify(sortedParams, { encode: false });
        const paymentUrl = this.paymentUrl + '?' + finalQueryString;

        // DEBUG: Log URL và data cuối cùng
        console.log('🔗 VNPay Payment URL:');
        console.log('  baseUrl:', this.paymentUrl);
        console.log('  queryString (first 300 chars):', finalQueryString.substring(0, 300));
        console.log('  fullUrlLength:', paymentUrl.length);
        console.log('  hasSecureHash:', !!sortedParams.vnp_SecureHash);
        console.log('  Full URL:', paymentUrl);

        return paymentUrl;
    }

    /**
     * Verify callback từ VNPay
     * @param {Object} vnp_Params - Params từ VNPay callback
     * @returns {Object} {isValid, responseCode, transactionStatus, ...}
    */
    verifyReturnUrl(vnp_Params) {
        // Load config nếu chưa load (lazy loading)
        this._loadConfig();

        const secureHash = vnp_Params.vnp_SecureHash;
        delete vnp_Params.vnp_SecureHash;
        delete vnp_Params.vnp_SecureHashType;

        // Sắp xếp params
        const sortedParams = this.sortObject(vnp_Params);

        // Tạo query string cho signData manually
        // Lưu ý: sortedParams đã được encode trong sortObject (và thay %20 bằng +)
        // Format: key1=encoded_value1&key2=encoded_value2&...
        const signData = Object.keys(sortedParams)
            .sort()
            .map(key => `${key}=${sortedParams[key]}`)
            .join('&');
        // Tạo chữ ký - VNPay yêu cầu dùng Buffer.from()
        const hmac = crypto.createHmac('sha512', this.hashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // Verify signature
        const isValid = secureHash === signed;

        return {
            isValid,
            orderId: vnp_Params.vnp_TxnRef,
            transactionId: vnp_Params.vnp_TransactionNo,
            responseCode: vnp_Params.vnp_ResponseCode,
            amount: vnp_Params.vnp_Amount ? parseInt(vnp_Params.vnp_Amount) / 100 : 0, // Chuyển từ xu về VND
            bankCode: vnp_Params.vnp_BankCode,
            transactionStatus: vnp_Params.vnp_TransactionStatus,
            payDate: vnp_Params.vnp_PayDate,
            message: this.getResponseMessage(vnp_Params.vnp_ResponseCode),
        };
    }

    // Format date theo format VNPay yêu cầu (yyyyMMddHHmmss)
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    // Sắp xếp object theo key và encode values (theo format VNPay)
    sortObject(obj) {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        keys.forEach(key => {
            // VNPay yêu cầu: encode giá trị và thay %20 bằng +
            const value = obj[key];
            const encoded = encodeURIComponent(value).replace(/%20/g, '+');
            sorted[key] = encoded;
        });
        return sorted;
    }

    // Lấy message từ response code
    getResponseMessage(responseCode) {
        const responseMessages = {
            '00': 'Giao dịch thành công',
            '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
            '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
            '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
            '11': 'Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.',
            '12': 'Thẻ/Tài khoản bị khóa.',
            '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
            '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
            '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
            '75': 'Ngân hàng thanh toán đang bảo trì.',
            '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
            '99': 'Lỗi không xác định.',
        };
        return responseMessages[responseCode] || 'Lỗi không xác định';
    }
}
//

export default new VNPay();