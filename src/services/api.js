import axios from 'axios';
import { useRoutesStore } from '../stores/routes';
import logger from '../utils/logger.js';

// Configuración del interceptor para manejar tokens
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Use secure logger that sanitizes sensitive data
  logger.request(config);
  return config;
});

// Interceptor de respuesta para logs
axios.interceptors.response.use(
  response => {
    // Use secure logger that sanitizes sensitive data
    logger.response(response);
    return response;
  },
  error => {
    logger.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return Promise.reject(error);
  }
);

export const formatApiError = (error) => {
  const responseData = error.response?.data;
  const formattedError = (responseData && typeof responseData === 'object')
    ? { ...responseData }
    : { error: error.message };

  formattedError.status = error.response?.status;
  formattedError.statusCode = error.response?.status;

  if (typeof formattedError.message !== 'string' || formattedError.message.length === 0) {
    formattedError.message = formattedError.error || 'Ocurrió un error inesperado.';
  }

  if (responseData?.code) {
    formattedError.code = responseData.code;
  }

  if (formattedError.code === 'VERIFICATION_REQUIRED') {
    formattedError.verificationRequired = true;
    formattedError.message = formattedError.message || 'Debes verificar tu cuenta antes de continuar.';
  }

  return formattedError;
};

export const authService = {
  async register(userData) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullUserRoutes.register, userData);
      
      // Tu backend NO devuelve token inmediatamente, requiere verificación
      // No guardamos token aquí porque el usuario no está verificado
      
      return response.data;
    } catch (error) {
      logger.error('Registration error:', error);
      // Propagar el error específico del backend
      throw formatApiError(error);
    }
  },
  
  async login(credentials) {
    try {
      const routesStore = useRoutesStore();
      const loginUrl = routesStore.fullUserRoutes.login;
      
      // Log for debugging in production
      if (import.meta.env.MODE === 'production') {
        console.log('[AuthService] Login attempt:', {
          url: loginUrl,
          hasEmail: !!credentials.email,
          emailLength: credentials.email?.length || 0,
          hasPassword: !!credentials.password,
          passwordLength: credentials.password?.length || 0
        });
      }
      
      const response = await axios.post(loginUrl, credentials);
      
      // Log response structure in production
      if (import.meta.env.MODE === 'production') {
        console.log('[AuthService] Login response:', {
          status: response.status,
          hasToken: !!response.data?.token,
          hasSuccess: !!response.data?.success,
          hasError: !!response.data?.error,
          errorMessage: response.data?.error
        });
      }
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      // Enhanced error logging for production
      if (import.meta.env.MODE === 'production') {
        console.error('[AuthService] Login error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorData: error.response?.data,
          message: error.message,
          url: error.config?.url
        });
      }
      logger.error('Login error:', error);
      throw formatApiError(error);
    }
  },
  
  async verifyEmail(token) {
    try {
      const routesStore = useRoutesStore();
      // Usar GET con el token en la URL (como el backend espera)
      const response = await axios.get(`${routesStore.fullUserRoutes.verify}/${token}`);
      return response.data;
    } catch (error) {
      logger.error('Verification error:', error);
      throw formatApiError(error);
    }
  },

  async resendVerification(email) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post('/api/users/resend-verification', { email });
      return response.data;
    } catch (error) {
      logger.error('Resend verification error:', error);
      throw formatApiError(error);
    }
  },

  async requestPasswordReset(email) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullUserRoutes.resetPasswordRequest, { email });
      return response.data;
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw formatApiError(error);
    }
  },

  async resetPassword(token, password) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.getResetPasswordUrl(token), { password });
      return response.data;
    } catch (error) {
      logger.error('Password reset error:', error);
      throw formatApiError(error);
    }
  },

  async getUserProfile(identifier) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.getUserProfileUrl(identifier));
      return response.data;
    } catch (error) {
      logger.error('Get user profile error:', error);
      throw formatApiError(error);
    }
  },


  async updateProfile(profileData) {
    try {
      const routesStore = useRoutesStore();
      // Usando la ruta updateProfile para PUT /users/profile
      const response = await axios.put(routesStore.fullUserRoutes.updateProfile, profileData);
      return response.data;
    } catch (error) {
      logger.error('Update profile error:', error);
      throw formatApiError(error);
    }
  }
};

// Servicios de productos
export const productService = {
  async getAllProducts(params = {}) {
    try {
      const routesStore = useRoutesStore();
      // Add cache-busting parameter and pagination params
      const queryParams = new URLSearchParams({
        _t: Date.now(),
        ...(params.limit && { limit: params.limit }),
        ...(params.page && { page: params.page }),
        ...(params.category && { category: params.category }),
        ...(params.search && { search: params.search })
      });
      const url = `${routesStore.fullProductRoutes.getAll}?${queryParams.toString()}`;
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      // Response.data from axios is: { success: true, data: { products: [...], pagination: {...} } }
      // Log for debugging in production - show the actual structure
      if (import.meta.env.MODE === 'production') {
        console.log('[ProductService] Raw axios response.data:', response.data);
        console.log('[ProductService] Response structure analysis:', {
          status: response.status,
          hasSuccess: !!response.data?.success,
          hasData: !!response.data?.data,
          dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
          hasProducts: !!response.data?.data?.products,
          productsLength: response.data?.data?.products?.length || 0,
          isProductsArray: Array.isArray(response.data?.data?.products),
          // What we're returning
          returning: response.data
        });
      }
      return response.data;
    } catch (error) {
      logger.error('Get products error:', error);
      throw formatApiError(error);
    }
  },

  async getProductById(id) {
    try {
      const routesStore = useRoutesStore();
      const url = routesStore.getProductByIdUrl(id);
      
      const response = await axios.get(url);
      
      return response.data;
    } catch (error) {
      logger.error('Error obteniendo producto por ID:', error);
      throw formatApiError(error);
    }
  },

  async createProduct(productData) {
    try {
      const routesStore = useRoutesStore();
      
      // Configurar headers para FormData si es necesario
      const config = {}
      if (productData instanceof FormData) {
        config.headers = {
          'Content-Type': 'multipart/form-data'
        }
      }
      
      const response = await axios.post(routesStore.fullProductRoutes.create, productData, config);
      return response.data;
    } catch (error) {
      logger.error('Create product error:', error);
      throw formatApiError(error);
    }
  },

  async updateProduct(id, productData) {
    try {
      const routesStore = useRoutesStore();
      
      // Configurar headers para FormData si es necesario
      const config = {}
      if (productData instanceof FormData) {
        config.headers = {
          'Content-Type': 'multipart/form-data'
        }
      }
      
      const response = await axios.put(routesStore.getUpdateProductUrl(id), productData, config);
      return response.data;
    } catch (error) {
      logger.error('Update product error:', error);
      throw formatApiError(error);
    }
  },

  async deleteProduct(id) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.delete(routesStore.getDeleteProductUrl(id));
      return response.data;
    } catch (error) {
      logger.error('Delete product error:', error);
      throw formatApiError(error);
    }
  },

  async updateStock(id, stock) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.patch(routesStore.getUpdateStockUrl(id), { stock });
      return response.data;
    } catch (error) {
      logger.error('Update stock error:', error);
      throw formatApiError(error);
    }
  },

  async getCategories() {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.fullProductRoutes.getCategories);
      return response.data;
    } catch (error) {
      logger.error('Get categories error:', error);
      throw formatApiError(error);
    }
  },

  async getFeaturedProducts(params = {}) {
    try {
      const routesStore = useRoutesStore();
      const queryParams = new URLSearchParams({
        _t: Date.now(),
        ...(params.limit && { limit: params.limit }),
        ...(params.page && { page: params.page })
      });
      const url = `${routesStore.fullProductRoutes.getFeatured}?${queryParams.toString()}`;
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Get featured products error:', error);
      throw formatApiError(error);
    }
  },

  async getOnSaleProducts(params = {}) {
    try {
      const routesStore = useRoutesStore();
      const queryParams = new URLSearchParams({
        _t: Date.now(),
        ...(params.limit && { limit: params.limit }),
        ...(params.page && { page: params.page })
      });
      const url = `${routesStore.fullProductRoutes.getOffers}?${queryParams.toString()}`;
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Get on sale products error:', error);
      throw formatApiError(error);
    }
  }
};

// Servicios de órdenes
export const orderService = {
  async createOrder(orderData) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullOrderRoutes.create, orderData);
      return response.data;
    } catch (error) {
      logger.error('Create order error:', error);
      throw formatApiError(error);
    }
  },

  async getUserOrders() {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.fullOrderRoutes.getUserOrders);
      return response.data;
    } catch (error) {
      logger.error('Get user orders error:', error);
      throw formatApiError(error);
    }
  },

  async getOrderById(orderId) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.getOrderByIdUrl(orderId));
      return response.data;
    } catch (error) {
      logger.error('Get order error:', error);
      throw formatApiError(error);
    }
  },

  async cancelOrder(orderId) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.patch(routesStore.getCancelOrderUrl(orderId));
      return response.data;
    } catch (error) {
      logger.error('Cancel order error:', error);
      throw formatApiError(error);
    }
  }
};

// Servicios de carrito
export const cartService = {
  async getCart() {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.fullCartRoutes.get);
      return response.data;
    } catch (error) {
      logger.error('Get cart error:', error);
      throw formatApiError(error);
    }
  },

  async getCartSummary() {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.fullCartRoutes.getSummary);
      return response.data;
    } catch (error) {
      logger.error('Get cart summary error:', error);
      throw formatApiError(error);
    }
  },

  async addToCart(productData) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullCartRoutes.add, productData);
      return response.data;
    } catch (error) {
      logger.error('Add to cart error:', error);
      throw formatApiError(error);
    }
  },

  async updateCartItem(itemData) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.put(routesStore.fullCartRoutes.update, itemData);
      return response.data;
    } catch (error) {
      logger.error('Update cart item error:', error);
      throw formatApiError(error);
    }
  },

  async removeFromCart(productId) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.delete(routesStore.getRemoveFromCartUrl(productId));
      return response.data;
    } catch (error) {
      logger.error('Remove from cart error:', error);
      throw formatApiError(error);
    }
  },

  async clearCart() {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.delete(routesStore.fullCartRoutes.clear);
      return response.data;
    } catch (error) {
      logger.error('Clear cart error:', error);
      throw formatApiError(error);
    }
  }
};

/** Cotización y destinos de envío (estimado o Starken según backend; rutas públicas) */
export const shippingService = {
  async getDestinations() {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.fullShippingRoutes.destinations);
      return response.data?.data ?? response.data;
    } catch (error) {
      logger.error('Shipping destinations error:', error);
      throw formatApiError(error);
    }
  },

  async getQuote(body) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullShippingRoutes.quote, body);
      return response.data?.data ?? response.data;
    } catch (error) {
      logger.error('Shipping quote error:', error);
      throw formatApiError(error);
    }
  }
};

// Servicios de pagos
export const paymentService = {
  async initiatePayment(paymentPayload) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullPaymentRoutes.initiate, paymentPayload);
      return response.data;
    } catch (error) {
      logger.error('Initiate payment error:', error);
      throw formatApiError(error);
    }
  },

  async confirmPayment(tokenWs) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullPaymentRoutes.confirm, { token_ws: tokenWs });
      return response.data;
    } catch (error) {
      logger.error('Confirm payment error:', error);
      throw formatApiError(error);
    }
  },

  async getPaymentStatus(orderId) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.getPaymentStatusUrl(orderId));
      return response.data;
    } catch (error) {
      logger.error('Get payment status error:', error);
      throw formatApiError(error);
    }
  },

  async refundPayment(orderId, amount = null) {
    try {
      const routesStore = useRoutesStore();
      const body = amount ? { amount } : {};
      const response = await axios.post(routesStore.getRefundPaymentUrl(orderId), body);
      return response.data;
    } catch (error) {
      logger.error('Refund payment error:', error);
      throw formatApiError(error);
    }
  },

  async initiateMercadoPagoPayment(paymentPayload) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(
        routesStore.fullPaymentRoutes.mercadoPagoInitiate,
        paymentPayload
      );
      return response.data;
    } catch (error) {
      logger.error('Initiate Mercado Pago payment error:', error);
      throw formatApiError(error);
    }
  },

  async confirmMercadoPagoPayment(payload) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(
        routesStore.fullPaymentRoutes.mercadoPagoConfirm,
        payload
      );
      return response.data;
    } catch (error) {
      logger.error('Confirm Mercado Pago payment error:', error);
      throw formatApiError(error);
    }
  }
};

// Servicios de administración
export const adminService = {
  // Gestión de productos
  async createProduct(productData) {
    try {
      const routesStore = useRoutesStore();
      
      // Configurar headers para FormData si es necesario
      const config = {}
      if (productData instanceof FormData) {
        config.headers = {
          'Content-Type': 'multipart/form-data'
        }
      }
      
      const response = await axios.post(routesStore.fullProductRoutes.create, productData, config);
      return response.data;
    } catch (error) {
      logger.error('Create product error:', error);
      throw formatApiError(error);
    }
  },

  async updateProduct(id, productData) {
    try {
      const routesStore = useRoutesStore();
      
      // Configurar headers para FormData si es necesario
      const config = {}
      if (productData instanceof FormData) {
        config.headers = {
          'Content-Type': 'multipart/form-data'
        }
      }
      
      const response = await axios.put(routesStore.getUpdateProductUrl(id), productData, config);
      return response.data;
    } catch (error) {
      logger.error('Update product error:', error);
      throw formatApiError(error);
    }
  },

  async deleteProduct(id) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.delete(routesStore.getDeleteProductUrl(id));
      return response.data;
    } catch (error) {
      logger.error('Delete product error:', error);
      throw formatApiError(error);
    }
  },

  async updateProductStock(id, stock) {
    try {
      const routesStore = useRoutesStore();
      const url = routesStore.getUpdateStockUrl(id);
      const data = { stock };
      
      const response = await axios.patch(url, data);
      return response.data;
    } catch (error) {
      logger.error('Update stock error:', error);
      throw formatApiError(error);
    }
  },

  async getAllProducts() {
    try {
      const routesStore = useRoutesStore();
      // Evitar respuestas GET cacheadas (proxy/navegador): el listado debe coincidir con el último PUT/PATCH.
      const url = `${routesStore.fullProductRoutes.getAllAdmin}?_t=${Date.now()}`;
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Admin get all products error:', error);
      throw formatApiError(error);
    }
  },

  // Gestión de órdenes
  async getAllOrders(params = {}) {
    try {
      const routesStore = useRoutesStore();
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.search) queryParams.append('search', params.search);
      
      const url = queryParams.toString() 
        ? `${routesStore.fullOrderRoutes.getAllAdmin}?${queryParams.toString()}`
        : routesStore.fullOrderRoutes.getAllAdmin;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      logger.error('Get all orders error:', error);
      throw formatApiError(error);
    }
  },

  async getOrderStats(period = '30d') {
    try {
      const routesStore = useRoutesStore();
      const url = period === 'all' 
        ? routesStore.fullOrderRoutes.getStatsAdmin 
        : `${routesStore.fullOrderRoutes.getStatsAdmin}?period=${period}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      logger.error('Get order stats error:', error);
      throw formatApiError(error);
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.patch(routesStore.getUpdateOrderStatusUrl(orderId), { status });
      return response.data;
    } catch (error) {
      logger.error('Update order status error:', error);
      throw formatApiError(error);
    }
  },

  // Transbank Payment Management
  async getPaymentStatus(orderId) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.getPaymentStatusUrl(orderId));
      return response.data;
    } catch (error) {
      logger.error('Get payment status error:', error);
      throw formatApiError(error);
    }
  },

  async refundPayment(orderId, amount = null) {
    try {
      const routesStore = useRoutesStore();
      const body = amount ? { amount } : {};
      const response = await axios.post(routesStore.getRefundPaymentUrl(orderId), body);
      return response.data;
    } catch (error) {
      logger.error('Refund payment error:', error);
      throw formatApiError(error);
    }
  },

  async getOrderDetails(orderId) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.getOrderByIdUrl(orderId));
      return response.data;
    } catch (error) {
      logger.error('Get order details error:', error);
      throw formatApiError(error);
    }
  },

  // Gestión de usuarios
  async getAllUsers() {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.fullUserRoutes.getAllAdmin);
      return response.data;
    } catch (error) {
      logger.error('Get all users error:', error);
      throw formatApiError(error);
    }
  },

  async getUserById(id) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.get(routesStore.getUserByIdUrl(id));
      return response.data;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw formatApiError(error);
    }
  },

  async updateUser(id, userData) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.put(routesStore.getUpdateUserUrl(id), userData);
      return response.data;
    } catch (error) {
      logger.error('Update user error:', error);
      throw formatApiError(error);
    }
  },

  async deleteUser(id) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.delete(routesStore.getDeleteUserUrl(id));
      return response.data;
    } catch (error) {
      logger.error('Delete user error:', error);
      throw formatApiError(error);
    }
  },

  async reactivateUser(id) {
    try {
      const routesStore = useRoutesStore();
      // Llamar al endpoint dedicado de restauración
      const restoreUrl = `${routesStore.getUpdateUserUrl(id)}/restore`;
      const response = await axios.put(restoreUrl);
      return response.data;
    } catch (error) {
      logger.error('Reactivate user error:', error);
      throw formatApiError(error);
    }
  },

  async getUserStats() {
    try {
      const response = await axios.get('/api/users/stats');
      return response.data;
    } catch (error) {
      logger.error('Get user stats error:', error);
      throw formatApiError(error);
    }
  }
};

// Contact service
export const contactService = {
  async submitContactForm(contactData) {
    try {
      const routesStore = useRoutesStore();
      const response = await axios.post(routesStore.fullContactRoute, contactData);
      return response.data;
    } catch (error) {
      logger.error('Submit contact form error:', error);
      throw formatApiError(error);
    }
  }
}; 