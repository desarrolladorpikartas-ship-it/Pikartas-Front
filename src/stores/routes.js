import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Store de Pinia para manejar todas las rutas del backend de forma centralizada
 * 
 * CARACTERÍSTICAS:
 * - Organiza las rutas por categorías (usuarios, productos, órdenes, carrito)
 * - Proporciona URLs completas y métodos para URLs dinámicas
 * - Permite cambiar fácilmente la base URL para diferentes ambientes
 * - Todas las rutas están basadas en las backend rules del proyecto
 * 
 * USO BÁSICO:
 * ```javascript
 * import { useRoutesStore } from '@/stores/routes'
 * 
 * // En un componente
 * const routesStore = useRoutesStore()
 * 
 * // Usar rutas completas
 * console.log(routesStore.fullUserRoutes.login) // http://localhost:4005/users/login
 * 
 * // Usar métodos dinámicos
 * const userProfileUrl = routesStore.getUserProfileUrl('123') // http://localhost:4005/users/profile/123
 * 
 * // Cambiar ambiente
 * routesStore.setBaseURL('https://api.tudominio.com')
 * ```
 * 
 * INTEGRACIÓN CON SERVICIOS:
 * Los servicios en api.js ya usan este store automáticamente,
 * por lo que no necesitas cambiar nada en tus componentes existentes.
 */

export const useRoutesStore = defineStore('routes', () => {
  // Base URL del backend
  // In development: use localhost
  // In production: use VITE_API_BASE_URL or auto-detect
  const getBaseURL = () => {
    if (import.meta.env.MODE === 'production') {
      // Use environment variable if set (remove trailing slash if present)
      if (import.meta.env.VITE_API_BASE_URL) {
        const url = import.meta.env.VITE_API_BASE_URL.trim();
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        // Log for debugging
        console.log('[RoutesStore] Using VITE_API_BASE_URL:', cleanUrl);
        return cleanUrl;
      }
      // Auto-detect: try to infer backend URL from frontend URL
      // For Vercel deployments, backend and frontend often follow a pattern
      // This is a fallback - explicit VITE_API_BASE_URL is recommended
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      // Replace frontend project name with backend project name pattern
      // Example: shop-vue-core -> shop-node-core
      const inferredBackendUrl = currentOrigin.replace(/shop-vue-core/i, 'shop-node-core');
      // Only use inferred URL if it's different from current origin (avoid loop)
      if (inferredBackendUrl !== currentOrigin && inferredBackendUrl.startsWith('http')) {
        console.warn('[RoutesStore] Auto-detecting backend URL:', inferredBackendUrl);
        console.warn('[RoutesStore] ⚠️ Consider setting VITE_API_BASE_URL explicitly in Vercel environment variables');
        return inferredBackendUrl;
      }
      // Last resort: return original (should never happen in production with proper config)
      console.error('[RoutesStore] ⚠️ No VITE_API_BASE_URL set and auto-detection failed. Using fallback.');
      return currentOrigin || 'http://localhost:4005';
    }
    // Development mode
    return 'http://localhost:4005';
  };
  
  const baseURL = ref(getBaseURL());
  
  // Log base URL in production for debugging
  if (import.meta.env.MODE === 'production') {
    console.log('[RoutesStore] Base URL initialized:', baseURL.value);
  }
  
  // Rutas de usuarios
  const userRoutes = ref({
    register: '/users/register',
    login: '/users/login',
    verify: '/users/verify',
    resetPasswordRequest: '/users/reset-password-request',
    resetPassword: '/users/reset-password',
    profile: '/users/profile',
    updateProfile: '/users/profile', // Ruta PUT para actualizar perfil
    getAllAdmin: '/users/all', // Ruta GET para obtener todos los usuarios (Admin)
    getById: '/users', // Base para obtener usuario por ID
    updateById: '/users', // Base para actualizar usuario por ID
    deleteById: '/users' // Base para eliminar usuario por ID
  });

  // Rutas de productos
  const productRoutes = ref({
    getAll: '/api/products',
    getById: '/api/products',
    create: '/api/products',
    update: '/api/products',
    delete: '/api/products',
    updateStock: '/api/products',
    getAllAdmin: '/api/products/admin/all',
    getCategories: '/api/products/categories',
    getFeatured: '/api/products/featured',
    getOffers: '/api/products/offers'
  });

  // Rutas de órdenes
  const orderRoutes = ref({
    create: '/api/orders',
    getUserOrders: '/api/orders/my-orders',
    getById: '/api/orders',
    cancel: '/api/orders',
    getAllAdmin: '/api/orders/admin/all',
    getStatsAdmin: '/api/orders/admin/stats',
    updateStatusAdmin: '/api/orders/admin'
  });

  // Rutas de carrito
  const cartRoutes = ref({
    get: '/api/cart',
    getSummary: '/api/cart/summary',
    add: '/api/cart/add',
    update: '/api/cart/update',
    remove: '/api/cart/remove',
    clear: '/api/cart/clear'
  });

  // Rutas de pagos
  const paymentRoutes = ref({
    initiate: '/api/payments/initiate',
    confirm: '/api/payments/confirm',
    status: '/api/payments/status',
    refund: '/api/payments/refund',
    mercadoPagoInitiate: '/api/payments/mercadopago/initiate',
    mercadoPagoConfirm: '/api/payments/mercadopago/confirm'
  });

  // Ruta de contacto
  const contactRoute = ref('/api/contact');

  // Envío (cotización)
  const shippingRoutes = ref({
    destinations: '/api/shipping/destinations',
    quote: '/api/shipping/quote'
  });

  // Computed para obtener URLs completas
  const fullUserRoutes = computed(() => {
    const routes = {};
    Object.keys(userRoutes.value).forEach(key => {
      routes[key] = `${baseURL.value}${userRoutes.value[key]}`;
    });
    return routes;
  });

  const fullProductRoutes = computed(() => {
    const routes = {};
    Object.keys(productRoutes.value).forEach(key => {
      routes[key] = `${baseURL.value}${productRoutes.value[key]}`;
    });
    return routes;
  });

  const fullOrderRoutes = computed(() => {
    const routes = {};
    Object.keys(orderRoutes.value).forEach(key => {
      routes[key] = `${baseURL.value}${orderRoutes.value[key]}`;
    });
    return routes;
  });

  const fullCartRoutes = computed(() => {
    const routes = {};
    Object.keys(cartRoutes.value).forEach(key => {
      routes[key] = `${baseURL.value}${cartRoutes.value[key]}`;
    });
    return routes;
  });

  const fullPaymentRoutes = computed(() => {
    const routes = {};
    Object.keys(paymentRoutes.value).forEach(key => {
      routes[key] = `${baseURL.value}${paymentRoutes.value[key]}`;
    });
    return routes;
  });

  const fullContactRoute = computed(() => {
    return `${baseURL.value}${contactRoute.value}`;
  });

  const fullShippingRoutes = computed(() => {
    const routes = {};
    Object.keys(shippingRoutes.value).forEach((key) => {
      routes[key] = `${baseURL.value}${shippingRoutes.value[key]}`;
    });
    return routes;
  });

  // Métodos para construir URLs dinámicas
  const getUserProfileUrl = (identifier) => {
    return `${baseURL.value}${userRoutes.value.profile}/${identifier}`;
  };

  const getResetPasswordUrl = (token) => {
    return `${baseURL.value}${userRoutes.value.resetPassword}/${token}`;
  };

  const getProductByIdUrl = (id) => {
    return `${baseURL.value}${productRoutes.value.getById}/${id}`;
  };

  const getUpdateProductUrl = (id) => {
    return `${baseURL.value}${productRoutes.value.update}/${id}`;
  };

  const getDeleteProductUrl = (id) => {
    return `${baseURL.value}${productRoutes.value.delete}/${id}`;
  };

  const getUpdateStockUrl = (id) => {
    return `${baseURL.value}${productRoutes.value.updateStock}/${id}/stock`;
  };

  const getOrderByIdUrl = (orderId) => {
    return `${baseURL.value}${orderRoutes.value.getById}/${orderId}`;
  };

  const getCancelOrderUrl = (orderId) => {
    return `${baseURL.value}${orderRoutes.value.cancel}/${orderId}/cancel`;
  };

  const getUpdateOrderStatusUrl = (orderId) => {
    return `${baseURL.value}${orderRoutes.value.updateStatusAdmin}/${orderId}/status`;
  };

  const getRemoveFromCartUrl = (productId) => {
    return `${baseURL.value}${cartRoutes.value.remove}/${productId}`;
  };

  const getPaymentStatusUrl = (orderId) => {
    return `${baseURL.value}${paymentRoutes.value.status}/${orderId}`;
  };

  const getRefundPaymentUrl = (orderId) => {
    return `${baseURL.value}${paymentRoutes.value.refund}/${orderId}`;
  };

  // Métodos para URLs de administración de usuarios
  const getUserByIdUrl = (id) => {
    return `${baseURL.value}${userRoutes.value.getById}/${id}`;
  };

  const getUpdateUserUrl = (id) => {
    return `${baseURL.value}${userRoutes.value.updateById}/${id}`;
  };

  const getDeleteUserUrl = (id) => {
    return `${baseURL.value}${userRoutes.value.deleteById}/${id}`;
  };

  // Método para cambiar la base URL (útil para diferentes ambientes)
  const setBaseURL = (newBaseURL) => {
    baseURL.value = newBaseURL;
  };

  // Método para obtener todas las rutas organizadas
  const getAllRoutes = computed(() => {
    return {
      users: fullUserRoutes.value,
      products: fullProductRoutes.value,
      orders: fullOrderRoutes.value,
      cart: fullCartRoutes.value,
      payments: fullPaymentRoutes.value,
      shipping: fullShippingRoutes.value
    };
  });

  return {
    // Estado
    baseURL,
    userRoutes,
    productRoutes,
    orderRoutes,
    cartRoutes,
    paymentRoutes,
    contactRoute,
    shippingRoutes,
    
    // Computed
    fullUserRoutes,
    fullProductRoutes,
    fullOrderRoutes,
    fullCartRoutes,
    fullPaymentRoutes,
    fullContactRoute,
    fullShippingRoutes,
    getAllRoutes,
    
    // Métodos
    setBaseURL,
    getUserProfileUrl,
    getResetPasswordUrl,
    getProductByIdUrl,
    getUpdateProductUrl,
    getDeleteProductUrl,
    getUpdateStockUrl,
    getOrderByIdUrl,
    getCancelOrderUrl,
    getUpdateOrderStatusUrl,
    getRemoveFromCartUrl,
    getPaymentStatusUrl,
    getRefundPaymentUrl,
    getUserByIdUrl,
    getUpdateUserUrl,
    getDeleteUserUrl
  };
}); 