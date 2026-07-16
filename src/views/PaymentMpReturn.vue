<template>
  <div class="payment-return">
    <div class="container">
      <div class="return-content">
        <div class="processing-icon">
          <div class="spinner">
            <font-awesome-icon icon="spinner" class="spinner-icon" :spin="true" />
          </div>
        </div>

        <h1>Procesando retorno de pago</h1>
        <p>Confirmando tu pago con Mercado Pago...</p>

        <div v-if="error" class="error-message">
          <h3>Error en la confirmación</h3>
          <p>{{ error }}</p>
          <div class="error-actions">
            <button @click="confirm" class="btn btn-primary">Intentar nuevamente</button>
            <router-link to="/checkout" class="btn btn-outline">Volver al checkout</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart.js'
import { useNotifications } from '../composables/useNotifications'
import mercadoPagoService from '../services/mercadoPago.js'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const { error: showError } = useNotifications()

const error = ref('')

const confirm = async () => {
  error.value = ''
  try {
    const paymentId = route.query.payment_id || route.query.collection_id
    const preferenceId = route.query.preference_id
    const stored = mercadoPagoService.getStoredPaymentData()

    const data = await mercadoPagoService.confirmPayment({
      payment_id: paymentId || undefined,
      preference_id: preferenceId || stored?.preferenceId || undefined,
      order_id: stored?.orderId || undefined
    })

    const status = data?.data?.paymentStatus || 'pending'
    mercadoPagoService.clearStoredPaymentData()

    try {
      await cartStore.clearCart()
    } catch {
      // ignore
    }

    if (status === 'paid') {
      router.replace({
        name: 'PaymentSuccess',
        query: {
          orderId: data.data.orderId,
          orderNumber: data.data.orderNumber,
          amount: data.data.amount
        }
      })
      return
    }

    if (status === 'failed' || route.query.status === 'failure') {
      router.replace({
        name: 'PaymentError',
        query: { message: 'El pago no fue aprobado en Mercado Pago.' }
      })
      return
    }

    // pending / in_process
    router.replace({
      name: 'PaymentSuccess',
      query: {
        orderId: data.data.orderId,
        orderNumber: data.data.orderNumber,
        amount: data.data.amount,
        pending: '1'
      }
    })
  } catch (err) {
    const msg = err?.message || 'No se pudo confirmar el pago'
    error.value = msg
    showError(msg)
  }
}

onMounted(() => {
  confirm()
})
</script>

<style scoped>
.payment-return {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}
.return-content {
  text-align: center;
  max-width: 480px;
}
.spinner-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
.error-message {
  margin-top: 1.5rem;
}
.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}
</style>
