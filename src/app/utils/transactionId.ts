import { PAYMENT_METHOD } from "../modules/payment/payment.interface"

const getTransactionId = (method: PAYMENT_METHOD) => {

    const prefixMap = {
        CASH: "CASH",
        SSLCOMMERZ: "SSL",
        PAYPAL: "PAY",
        STRIPE: "STR"
    }

    const prefix = prefixMap[method] || "TXN"

    const date = new Date() //2026-01-23
    const ymd = date.toISOString()  //2026-01-23T14:30:00.000Z
        .slice(2, 10) //26-01-23
        .replace(/-/g, "") //260123

    const random = Math.random()
        .toString(36) // নাম্বারটিকে Base36 (সংখ্যা + অক্ষর) এ রূপান্তর করে: "0.4f5g6h..."
        .substring(2, 6) // শুরু থেকে ৪টি ক্যারেক্টার নেয়: "4f5g"
        .toUpperCase()

    return `${prefix}${ymd}${random}`
}

export default getTransactionId