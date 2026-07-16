import { paymentService } from './api';

const STORAGE_KEY = 'pikartas_mp_payment';

class MercadoPagoService {
  async initiatePayment(paymentPayload) {
    return paymentService.initiateMercadoPagoPayment(paymentPayload);
  }

  async confirmPayment(payload) {
    return paymentService.confirmMercadoPagoPayment(payload);
  }

  async getPaymentStatus(orderId) {
    return paymentService.getPaymentStatus(orderId);
  }

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  storePaymentData(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
  }

  getStoredPaymentData() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  clearStoredPaymentData() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

const mercadoPagoService = new MercadoPagoService();
export default mercadoPagoService;
