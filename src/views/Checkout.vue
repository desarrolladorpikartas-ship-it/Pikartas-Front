<template>
  <div class="checkout">
    <div class="container">
      <div class="checkout-header">
        <h1 class="text-hero-title">
          <font-awesome-icon icon="credit-card" class="header-icon" />
          Finalizar Compra
        </h1>
        <p>Completa tu pedido de {{ cartItemCount }} artículos</p>
      </div>

      <div v-if="cartItems.length === 0" class="empty-cart">
        <div class="empty-cart-icon">
          <font-awesome-icon icon="shopping-cart" class="empty-cart-icon-svg" />
        </div>
        <h2>Tu carrito está vacío</h2>
        <p>Agrega productos antes de realizar una compra</p>
        <router-link to="/shop" class="btn btn-primary">
          <font-awesome-icon icon="store" class="btn-icon" />
          Ir a la Tienda
        </router-link>
      </div>

      <div v-else class="checkout-content">
        <div class="checkout-form">
          <form @submit.prevent="submitOrder">
            <!-- Shipping Information -->
            <div class="form-section">
              <h2>
                <font-awesome-icon icon="box" class="section-icon" />
                Información de Envío
              </h2>
              
                <div class="form-group">
                <label for="name">Nombre *</label>
                  <input 
                    type="text" 
                  id="name"
                  v-model="shippingForm.name" 
                    required
                  />
              </div>

              <div class="form-group">
                <label for="email">Email *</label>
                <input 
                  type="email" 
                  id="email"
                  v-model="shippingForm.email" 
                  required
                />
              </div>

              <div class="form-group">
                <label for="phone">Teléfono *</label>
                <input 
                  type="tel" 
                  id="phone"
                  v-model="shippingForm.phone" 
                  required
                />
              </div>

              <div class="form-group">
                <label for="address">Dirección *</label>
                <input 
                  type="text" 
                  id="address"
                  v-model="shippingForm.address" 
                  placeholder="Calle, número, piso, departamento"
                  required
                />
              </div>

              <div class="form-group">
                <label for="cityDest">Comuna o ciudad de destino *</label>
                <select
                  id="cityDest"
                  v-model="selectedCodigoCiudad"
                  class="form-select"
                  required
                  :disabled="loadingDestinations"
                >
                  <option value="" disabled>
                    {{ loadingDestinations ? 'Cargando ciudades...' : 'Selecciona una ciudad' }}
                  </option>
                  <option
                    v-for="c in cityOptions"
                    :key="c.codigoCiudad"
                    :value="c.codigoCiudad"
                  >
                    {{ c.nombreCiudad }}
                  </option>
                </select>
                <p v-if="quoteError" class="quote-warning">{{ quoteError }}</p>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="zipCode">Código Postal *</label>
                  <input 
                    type="text" 
                    id="zipCode"
                    v-model="shippingForm.zipCode" 
                    required
                  />
                </div>
              </div>
            </div>

            <!-- Payment Information -->
            <div class="form-section">
              <h2>
                <font-awesome-icon icon="credit-card" class="section-icon" />
                Información de Pago
              </h2>
              
              <div class="payment-method-selection">
                <button
                  type="button"
                  class="payment-option"
                  :class="{ selected: paymentProvider === 'webpay' }"
                  @click="paymentProvider = 'webpay'"
                >
                  <div class="payment-icon">
                    <font-awesome-icon icon="university" class="payment-icon-svg" />
                  </div>
                  <div class="payment-info">
                    <h3>Transbank Webpay Plus</h3>
                    <p>Pago seguro con tarjeta de crédito o débito</p>
                  </div>
                  <div class="payment-check" v-if="paymentProvider === 'webpay'">
                    <font-awesome-icon icon="check" class="check-icon" />
                  </div>
                </button>
                <button
                  type="button"
                  class="payment-option"
                  :class="{ selected: paymentProvider === 'mercadopago' }"
                  @click="paymentProvider = 'mercadopago'"
                >
                  <div class="payment-icon">
                    <font-awesome-icon icon="credit-card" class="payment-icon-svg" />
                  </div>
                  <div class="payment-info">
                    <h3>Mercado Pago</h3>
                    <p>Tarjetas, saldo MP y otros medios disponibles</p>
                  </div>
                  <div class="payment-check" v-if="paymentProvider === 'mercadopago'">
                    <font-awesome-icon icon="check" class="check-icon" />
                  </div>
                </button>
              </div>

            </div>

            <!-- Order Notes -->
            <div class="form-section">
              <h2>
                <font-awesome-icon icon="clipboard-list" class="section-icon" />
                Notas del Pedido
              </h2>
              
              <div class="form-group">
                <label for="orderNotes">Comentarios adicionales (opcional)</label>
                <textarea 
                  id="orderNotes"
                  v-model="orderNotes" 
                  rows="3"
                  placeholder="Instrucciones especiales para la entrega..."
                ></textarea>
              </div>
            </div>

            <div class="form-actions">
              <router-link to="/cart" class="btn btn-outline">
                <font-awesome-icon icon="arrow-left" class="btn-icon" />
                Volver al Carrito
              </router-link>
              <button type="submit" class="btn btn-primary" :disabled="isProcessing || finalTotal === null || loadingQuote || loadingDestinations || invalidStockItems.length > 0">
                <font-awesome-icon 
                  :icon="isProcessing ? 'spinner' : 'credit-card'" 
                  :spin="isProcessing"
                  class="btn-icon" 
                />
                {{ isProcessing ? 'Procesando...' : (finalTotal !== null ? `Pagar $${formatCLP(finalTotal)}` : 'Selecciona ciudad de envío') }}
              </button>
            </div>
          </form>
        </div>

        <div class="order-summary">
          <div class="summary-card">
            <h2>
              <font-awesome-icon icon="clipboard-list" class="summary-icon" />
              Resumen del Pedido
            </h2>
            
            <div class="order-items">
              <div v-for="item in cartItems" :key="item.id" class="order-item">
                <img :src="item.image" :alt="item.name" />
                <div class="item-info">
                  <h4>{{ item.name }}</h4>
                  <p>Cantidad: {{ item.quantity }}</p>
                </div>
                <div class="item-price">
                  ${{ formatCLP(item.price * item.quantity) }}
                </div>
              </div>
            </div>

            <div class="summary-totals">
              <p v-if="stockWarningMessage" class="checkout-stock-warning">{{ stockWarningMessage }}.</p>
              <div class="summary-line">
                <span>Subtotal:</span>
                <span>${{ formatCLP(cartTotal) }}</span>
              </div>
              
              <div class="summary-line">
                <span>Envío:</span>
                <span v-if="loadingQuote" class="muted">Cotizando…</span>
                <span v-else-if="displayShippingAmount !== null">${{ formatCLP(displayShippingAmount) }}</span>
                <span v-else class="muted">—</span>
              </div>
              
              <hr class="summary-divider">
              
              <div class="summary-line total-line">
                <span>Total:</span>
                <span class="total-amount">${{ finalTotal !== null ? formatCLP(finalTotal) : '—' }}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart.js'
import { useAuthStore } from '../stores/auth.js'
import { storeToRefs } from 'pinia'
import { useNotifications } from '../composables/useNotifications'
import { useCheckoutShipping } from '../composables/useCheckoutShipping.js'
import { formatCLP } from '../utils/formatters.js'

const router = useRouter()
const { success, error } = useNotifications()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { cartItems, cartTotal, cartItemCount } = storeToRefs(cartStore)
const { user, isAuthenticated } = storeToRefs(authStore)

const {
  cityOptions,
  selectedCodigoCiudad,
  loadingDestinations,
  loadingQuote,
  quoteError,
  displayShippingAmount,
  finalTotal,
  fetchDestinations
} = useCheckoutShipping(cartTotal)

// Form data
const shippingForm = reactive({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zipCode: ''
})

const paymentProvider = ref('webpay') // 'webpay' | 'mercadopago'

const orderNotes = ref('')
const isProcessing = ref(false)

const invalidStockItems = computed(() => cartItems.value.filter((item) => {
  const stock = Number(item.stock ?? 0)
  const quantity = Number(item.quantity ?? 0)
  return stock <= 0 || quantity > stock
}))

const stockWarningMessage = computed(() => {
  if (invalidStockItems.value.length === 0) return ''

  return invalidStockItems.value
    .map((item) => {
      if ((item.stock ?? 0) <= 0) {
        return `${item.name} está agotado`
      }

      return `${item.name} solo tiene ${item.stock} unidades disponibles`
    })
    .join('. ')
})

watch(selectedCodigoCiudad, (id) => {
  if (id === '' || id == null) {
    shippingForm.city = ''
    return
  }
  const o = cityOptions.value.find((x) => String(x.codigoCiudad) === String(id))
  shippingForm.city = o ? o.nombreCiudad : ''
})

// Methods

// Cargar datos del usuario desde la sesión
const loadUserData = () => {
  if (isAuthenticated.value && user.value) {
    if (user.value.name) {
      shippingForm.name = user.value.name
    }
    if (user.value.email) {
      shippingForm.email = user.value.email
    }
    if (user.value.telefono || user.value.phone) {
      shippingForm.phone = user.value.telefono || user.value.phone || ''
    }
  }
}

const submitOrder = async () => {
  isProcessing.value = true
  
  try {
    // Validate shipping form
    if (!shippingForm.name || !shippingForm.email || 
        !shippingForm.phone || !shippingForm.address || !shippingForm.zipCode) {
      throw new Error('Por favor completa todos los campos obligatorios')
    }

    if (selectedCodigoCiudad.value === '' || selectedCodigoCiudad.value == null) {
      throw new Error('Selecciona una ciudad de destino para el envío')
    }

    if (invalidStockItems.value.length > 0) {
      throw new Error(stockWarningMessage.value || 'Hay productos sin stock en tu carrito')
    }

    if (finalTotal.value === null || displayShippingAmount.value === null) {
      throw new Error('Espera la cotización de envío o revisa el mensaje de error arriba')
    }

    // Redirect to payment processing
    router.push({
      name: 'PaymentProcessing',
      query: {
        provider: paymentProvider.value,
        // Pass shipping data for payment initiation
        shippingData: JSON.stringify({
          name: shippingForm.name,
          email: shippingForm.email,
          phone: shippingForm.phone,
          address: shippingForm.address,
          city: shippingForm.city,
          zipCode: shippingForm.zipCode,
          orderNotes: orderNotes.value,
          codigoCiudadDestino: Number(selectedCodigoCiudad.value),
          clientShippingAmount: displayShippingAmount.value
        })
      }
    })
    
  } catch (err) {
    error(err.message || 'Error al procesar el pedido. Por favor, intenta nuevamente.')
  } finally {
    isProcessing.value = false
  }
}

// Load user data when component mounts
onMounted(() => {
  loadUserData()
  fetchDestinations()
})
</script>

<style scoped>
.container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.checkout {
  padding-top: 120px;
  padding-bottom: 80px;
  min-height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  font-family: var(--font-family-primary);
  --input-autofill-bg: rgba(0, 0, 0, 0.3);
  --input-autofill-text: #ffffff;
}

.checkout-header {
  text-align: center;
  margin-bottom: 3rem;
}

.checkout-header h1 {
  font-size: clamp(1rem, 3vw, 1.5rem);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.header-icon {
  color: var(--color-primary);
  font-size: 1.2em;
  transition: all var(--transition-normal);
}

.checkout-header:hover .header-icon {
  transform: scale(1.1) rotate(5deg);
}

.checkout-header p {
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--font-size-lg);
  margin: 0;
}

.empty-cart {
  text-align: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  padding: 4rem 2rem;
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-md);
  border: var(--border-width-thin) solid var(--color-primary);
}

.empty-cart-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-cart-icon-svg {
  font-size: 1em;
  color: var(--color-primary);
  transition: all var(--transition-normal);
}

.empty-cart:hover .empty-cart-icon-svg {
  transform: scale(1.1) rotate(-10deg);
  opacity: 1;
}

.empty-cart h2 {
  margin: 0 0 1rem 0;
  color: var(--color-white);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.empty-cart p {
  margin: 0 0 2rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--font-size-lg);
}

.checkout-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
}

.checkout-form {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: var(--border-radius-xl);
  padding: 2rem;
  box-shadow: var(--shadow-md);
  border: var(--border-width-thin) solid var(--color-primary);
}

.form-section {
  margin-bottom: 2.5rem;
}

.form-section:last-of-type {
  margin-bottom: 2rem;
}

.form-section h2 {
  font-size: var(--font-size-xl);
  margin: 0 0 1.5rem 0;
  color: var(--color-primary);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(253, 179, 28, 0.3);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: var(--font-weight-semibold);
}

.section-icon {
  color: var(--color-primary);
  font-size: 1.1em;
  transition: all var(--transition-normal);
}

.form-section:nth-child(2) .section-icon {
  color: var(--color-quaternary);
}

.form-section:nth-child(3) .section-icon {
  color: var(--color-primary-light);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-white);
  font-size: var(--font-size-sm);
}

.form-group input,
.form-group textarea,
.form-group select.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(253, 179, 28, 0.5);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-normal);
  background: rgba(0, 0, 0, 0.3);
  color: var(--color-white);
  font-family: var(--font-family-primary);
}

.quote-warning {
  margin-top: 0.35rem;
  font-size: var(--font-size-sm);
  color: #ffb4b4;
}

.muted {
  opacity: 0.75;
  font-style: italic;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 0 3px rgba(253, 179, 28, 0.2);
  color: var(--color-white);
}

.form-group input:hover:not(:focus),
.form-group textarea:hover:not(:focus),
.form-group select.form-select:hover:not(:focus) {
  background: rgba(0, 0, 0, 0.3);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.payment-method-selection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.payment-option {
  width: 100%;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  appearance: none;
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 2px solid rgba(253, 179, 28, 0.4);
  border-radius: var(--border-radius-lg);
  transition: all var(--transition-normal);
  background: rgba(0, 0, 0, 0.2);
}

.payment-option.selected {
  border-color: var(--color-primary);
  background: rgba(253, 179, 28, 0.15);
}

.payment-icon {
  font-size: 2rem;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-icon-svg {
  font-size: 1em;
  color: var(--color-primary);
  transition: all var(--transition-normal);
}

.payment-option:hover .payment-icon-svg {
  transform: scale(1.1);
}

.payment-info {
  flex: 1;
}

.payment-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: var(--font-size-base);
  color: var(--color-white);
  font-weight: var(--font-weight-semibold);
}

.payment-info p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.85);
}

.payment-check {
  width: 24px;
  height: 24px;
  background: var(--color-primary);
  color: var(--color-black);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.check-icon {
  font-size: 0.875rem;
  color: var(--color-black);
}

.payment-info-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--border-radius-lg);
  padding: 1rem;
  margin-top: 1rem;
  border: 1px solid rgba(253, 179, 28, 0.2);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.9);
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-icon {
  font-size: 1rem;
  color: var(--color-primary);
  transition: all var(--transition-normal);
}

.info-item:hover .info-icon {
  transform: scale(1.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.order-summary {
  position: sticky;
  top: 120px;
  height: fit-content;
}

.summary-card {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: var(--border-radius-xl);
  padding: 2rem;
  box-shadow: var(--shadow-md);
  border: var(--border-width-thin) solid var(--color-primary);
}

.summary-card h2 {
  margin: 0 0 1.5rem 0;
  font-size: var(--font-size-xl);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: var(--font-weight-semibold);
}

.summary-icon {
  color: var(--color-primary);
  font-size: 1.1em;
  transition: all var(--transition-normal);
}

.summary-card:hover .summary-icon {
  transform: scale(1.1) rotate(5deg);
}

.order-items {
  margin-bottom: 1.5rem;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(253, 179, 28, 0.2);
}

.order-item:last-child {
  border-bottom: none;
}

.order-item img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--border-radius-md);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: var(--font-size-sm);
  color: var(--color-white);
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: var(--font-weight-medium);
}

.item-info p {
  margin: 0;
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.8);
}

.item-price {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}

.summary-totals {
  padding-top: 1rem;
}

.checkout-stock-warning {
  margin: 0 0 1rem 0;
  color: #ffb4b4;
  font-size: var(--font-size-sm);
}

.summary-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.95);
}

.summary-divider {
  border: none;
  border-top: 1px solid rgba(253, 179, 28, 0.3);
  margin: 1.5rem 0;
}

.total-line {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  margin-bottom: 1.5rem;
  color: var(--color-white);
}

.total-amount {
  font-size: var(--font-size-2xl);
  color: var(--color-primary);
}

.security-info {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(253, 179, 28, 0.2);
}

.security-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.9);
}

.security-item:last-child {
  margin-bottom: 0;
}

.security-icon {
  font-size: 1rem;
  color: var(--color-primary);
  transition: all var(--transition-normal);
}

.security-item:hover .security-icon {
  transform: scale(1.1);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid;
  border-radius: 50px;
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
  text-align: center;
  text-decoration: none;
  transition: all var(--transition-normal);
  font-size: var(--font-size-base);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-family-primary);
}

.btn-icon {
  font-size: 0.875rem;
  transition: all var(--transition-normal);
}

.btn:hover .btn-icon {
  transform: scale(1.1);
}

.btn-outline .btn-icon {
  color: var(--color-white);
}

.btn-outline:hover .btn-icon {
  color: var(--color-black);
}

.btn-primary .btn-icon {
  color: var(--color-black);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  color: var(--color-white);
  border-color: var(--color-white);
}

.btn-outline:hover {
  background: var(--color-white);
  color: var(--color-black);
  border-color: var(--color-white);
}

.btn-primary {
  background: var(--color-white);
  color: var(--color-black);
  border-color: var(--color-white);
  font-size: var(--font-size-lg);
  padding: 1rem 2rem;
}

.btn-primary:hover:not(:disabled) {
  background: transparent;
  color: var(--color-white);
  border-color: var(--color-white);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .checkout-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .order-summary {
    position: static;
  }
}

@media (max-width: 768px) {
  .checkout-header h1 {
    font-size: 0.9rem;
  }
  
  .checkout-form {
    padding: var(--spacing-2xl);
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 var(--spacing-md);
  }
  
  .checkout-form,
  .summary-card {
    padding: var(--spacing-lg);
  }
}
</style> 