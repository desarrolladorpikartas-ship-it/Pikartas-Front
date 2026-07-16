<template>
  <div class="payment-processing">
    <div class="container">
      <div class="processing-content">
        <div class="processing-icon">
          <div class="spinner">
            <font-awesome-icon icon="spinner" class="spinner-icon" :spin="true" />
          </div>
        </div>
        
        <h1>Procesando pago</h1>
        <p>{{ processingMessage }}</p>
        
        <div class="processing-steps">
          <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
            <div class="step-icon">1</div>
            <span>Iniciando pago</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
            <div class="step-icon">2</div>
            <span>{{ redirectStepLabel }}</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
            <div class="step-icon">3</div>
            <span>Confirmando pago</span>
          </div>
        </div>

        <div v-if="error" class="error-message">
          <div class="error-icon">
            <font-awesome-icon icon="times-circle" class="error-icon-svg" />
          </div>
          <h3>Error en el Procesamiento</h3>
          <p>{{ error }}</p>
          <div class="error-actions">
            <button @click="retryPayment" class="btn btn-primary">
              <font-awesome-icon icon="redo" class="btn-icon" />
              Intentar Nuevamente
            </button>
            <router-link to="/checkout" class="btn btn-outline">
              <font-awesome-icon icon="arrow-left" class="btn-icon" />
              Volver al Checkout
            </router-link>
          </div>
        </div>

        <div v-if="isRedirecting" class="redirect-message">
          <div class="redirect-icon">
            <font-awesome-icon icon="sync-alt" class="redirect-icon-svg" :spin="true" />
          </div>
          <h3>{{ redirectingTitle }}</h3>
          <p>Serás redirigido automáticamente en unos segundos</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCartStore } from '../stores/cart.js'
import { useNotifications } from '../composables/useNotifications'
import transbankService from '../services/transbank.js'
import mercadoPagoService from '../services/mercadoPago.js'

const router = useRouter()
const route = useRoute()
const { error: showError } = useNotifications()
const cartStore = useCartStore()

// Reactive data
const currentStep = ref(1)
const error = ref('')
const isRedirecting = ref(false)
const paymentProvider = ref(route.query.provider === 'mercadopago' ? 'mercadopago' : 'webpay')

const isMercadoPago = computed(() => paymentProvider.value === 'mercadopago')
const providerLabel = computed(() => (isMercadoPago.value ? 'Mercado Pago' : 'Transbank'))
const processingMessage = computed(() =>
  isMercadoPago.value
    ? 'Estamos procesando tu pago. En un momento te llevamos a Mercado Pago...'
    : 'Estamos procesando tu pago. En un momento te llevamos a Transbank...'
)
const redirectStepLabel = computed(() => `Redirigiendo a ${providerLabel.value}`)
const redirectingTitle = computed(() => `Redirigiendo a ${providerLabel.value}...`)

// Payment data from route params
const orderId = ref(route.query.orderId)
const orderNumber = ref(route.query.orderNumber)
const transbankUrl = ref(route.query.transbankUrl)
const transbankToken = ref(route.query.token_ws)
const mercadoPagoInitPoint = ref(route.query.initPoint)

onMounted(async () => {
  // If we have a token from Transbank return, try to get stored payment data
  if (transbankToken.value && !orderId.value) {
    const storedData = transbankService.getStoredPaymentData()
    if (storedData) {
      orderId.value = storedData.orderId
      orderNumber.value = storedData.orderNumber
    }
  }
  
  await processPayment()
})

const processPayment = async () => {
  try {
    // Step 1: If we have a Transbank token, confirm the payment (return from Transbank)
    if (transbankToken.value) {
      currentStep.value = 3
      await confirmPayment()
    } 
    // Step 2: If we have a Transbank URL, redirect to Transbank
    else if (transbankUrl.value) {
      currentStep.value = 2
      await redirectToTransbank()
    }
    else if (mercadoPagoInitPoint.value) {
      currentStep.value = 2
      await redirectToMercadoPago()
    }
    // Step 3: Otherwise, initiate payment (coming from checkout)
    else {
      await initiatePayment()
    }
  } catch (err) {
    error.value = err.message || 'Error al procesar el pago'
    showError(error.value)
  }
}

const buildPaymentPayload = () => {
  let shippingAddress = {
    street: 'Av. Principal 123',
    city: 'Santiago',
    state: 'Metropolitana',
    zipCode: '7500000',
    country: 'Chile'
  }

  let shippingData = null
  if (route.query.shippingData) {
    try {
      shippingData = JSON.parse(route.query.shippingData)
      shippingAddress = {
        street: shippingData.address,
        city: shippingData.city,
        state: 'Metropolitana',
        zipCode: shippingData.zipCode,
        country: 'Chile'
      }
    } catch {
      // continue with default
    }
  }

  return {
    shippingAddress,
    notes: shippingData?.orderNotes || undefined,
    codigoCiudadDestino: shippingData?.codigoCiudadDestino,
    clientShippingAmount: shippingData?.clientShippingAmount
  }
}

const initiatePayment = async () => {
  try {
    console.log('Initiating payment...', { provider: paymentProvider.value })
    if (!transbankService.isAuthenticated()) {
      throw new Error('Debes iniciar sesión para procesar el pago')
    }

    const paymentPayload = buildPaymentPayload()

    if (paymentProvider.value === 'mercadopago') {
      const data = await mercadoPagoService.initiatePayment(paymentPayload)
      orderId.value = data.data.orderId
      orderNumber.value = data.data.orderNumber
      mercadoPagoInitPoint.value = data.data.initPoint
      mercadoPagoService.storePaymentData({
        orderId: data.data.orderId,
        orderNumber: data.data.orderNumber,
        preferenceId: data.data.preferenceId,
        initPoint: data.data.initPoint
      })
      currentStep.value = 2
      await redirectToMercadoPago()
      return
    }

    const data = await transbankService.initiatePayment(paymentPayload)

    // Store payment data
    orderId.value = data.data.orderId
    orderNumber.value = data.data.orderNumber
    transbankUrl.value = data.data.transbankUrl
    transbankToken.value = data.data.transbankToken

    // Redirect to Transbank
    currentStep.value = 2
    await redirectToTransbank()

  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('No se puede conectar con el servidor. Por favor, asegúrate de que el backend esté corriendo en el puerto 3000.')
    }
    throw new Error(err.message || 'Error al iniciar el pago')
  }
}

const redirectToMercadoPago = async () => {
  if (!mercadoPagoInitPoint.value) {
    throw new Error('URL de Mercado Pago no disponible')
  }
  isRedirecting.value = true
  setTimeout(() => {
    window.location.href = mercadoPagoInitPoint.value
  }, 1500)
}

const redirectToTransbank = async () => {
  if (!transbankUrl.value) {
    throw new Error('URL de Transbank no disponible')
  }

  isRedirecting.value = true
  
  // Store payment data using service
  transbankService.storePaymentData({
    orderId: orderId.value,
    orderNumber: orderNumber.value,
    transbankUrl: transbankUrl.value,
    transbankToken: transbankToken.value
  })

  // Redirect to Transbank
  setTimeout(() => {
    window.location.href = transbankUrl.value
  }, 2000)
}

const confirmPayment = async () => {
  try {
    if (!transbankToken.value) {
      throw new Error('Token de Transbank no encontrado')
    }

    const data = await transbankService.confirmPayment(transbankToken.value)

    // Clear cart on successful payment
    await cartStore.clearCart()

    // Clear stored payment data
    transbankService.clearStoredPaymentData()

    // Redirect to success page
    router.push({
      name: 'PaymentSuccess',
      query: {
        orderId: data.data.orderId,
        orderNumber: data.data.orderNumber,
        amount: data.data.amount,
        authorizationCode: data.data.authorizationCode
      }
    })

  } catch (err) {
    throw new Error(err.message || 'Error al confirmar el pago')
  }
}

const retryPayment = () => {
  error.value = ''
  currentStep.value = 1
  isRedirecting.value = false
  processPayment()
}
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
}

.payment-processing {
  padding-top: 120px;
  padding-bottom: 80px;
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  align-items: center;
}

.processing-content {
  background: white;
  border-radius: 12px;
  padding: 3rem 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.processing-icon {
  margin-bottom: 2rem;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-icon {
  font-size: 1.5rem;
  color: var(--icon-payment-processing-spinner);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.processing-content h1 {
  font-size: 2rem;
  margin: 0 0 1rem 0;
  color: #333;
  font-weight: 700;
}

.processing-content p {
  color: #666;
  font-size: 1.1rem;
  margin: 0 0 2rem 0;
}

.processing-steps {
  display: flex;
  justify-content: space-between;
  margin: 2rem 0;
  position: relative;
}

.processing-steps::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  height: 2px;
  background: #e9ecef;
  z-index: 1;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  background: white;
  padding: 0 1rem;
}

.step-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e9ecef;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: 0.5rem;
  transition: all 0.3s;
}

.step.active .step-icon {
  background: #007bff;
  color: white;
}

.step.completed .step-icon {
  background: #28a745;
  color: white;
}

.step span {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.step.active span {
  color: #007bff;
}

.step.completed span {
  color: #28a745;
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-icon-svg {
  font-size: 1em;
  color: var(--icon-payment-processing-error);
  transition: all var(--transition-normal);
}

.error-message:hover .error-icon-svg {
  transform: scale(1.1) rotate(10deg);
}

.error-message h3 {
  color: #721c24;
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.error-message p {
  color: #721c24;
  margin: 0 0 1.5rem 0;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.redirect-message {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
}

.redirect-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  animation: pulse 1.5s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}

.redirect-icon-svg {
  font-size: 1em;
  color: var(--icon-payment-processing-redirect);
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.redirect-message h3 {
  color: #0c5460;
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.redirect-message p {
  color: #0c5460;
  margin: 0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: all 0.3s;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon {
  font-size: 0.875rem;
  transition: all var(--transition-normal);
}

.btn:hover .btn-icon {
  transform: scale(1.1);
}

.btn-primary .btn-icon {
  color: var(--icon-payment-processing-retry-btn);
}

.btn-outline .btn-icon {
  color: var(--icon-payment-processing-back-btn);
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-primary:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-outline {
  background: transparent;
  color: #6c757d;
  border-color: #6c757d;
}

.btn-outline:hover {
  background: #6c757d;
  color: white;
}

/* Responsive Design */
@media (max-width: 768px) {
  .processing-content {
    padding: 2rem 1.5rem;
  }
  
  .processing-content h1 {
    font-size: 1.75rem;
  }
  
  .processing-steps {
    flex-direction: column;
    gap: 1rem;
  }
  
  .processing-steps::before {
    display: none;
  }
  
  .error-actions {
    flex-direction: column;
  }
}
</style>
