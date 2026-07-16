<template>


  <div class="cart-sidebar-overlay" v-show="isCartOpen" @click="closeCart">
    <div class="cart-sidebar" @click.stop :class="{ 'is-open': isCartOpen }" >
      <div class="cart-header">
        <h2><font-awesome-icon icon="shopping-cart" class="cart-title-icon" /> Carrito de Compras</h2>
        <button class="close-btn" @click="closeCart" title="Cerrar carrito">
          <font-awesome-icon icon="times" class="close-icon" />
        </button>
      </div>
      
      <div class="cart-content">
        <div v-if="loading && cartItems.length === 0" class="loading-state">
          <font-awesome-icon icon="spinner" class="loading-spinner" spin />
          <p>Cargando carrito...</p>
        </div>

        <div v-else-if="error && cartItems.length === 0" class="error-state">
          <font-awesome-icon icon="exclamation-triangle" class="error-icon" />
          <p>{{ error }}</p>
          <button class="action-btn retry-btn" @click="retryLoadCart">
            <font-awesome-icon icon="spinner" class="btn-icon" />
            <span class="btn-text">Reintentar</span>
          </button>
        </div>

        <!-- Mensaje cuando no hay items en el carrito -->
        <div v-if="cartItems.length === 0 && !loading && !error" class="empty-cart">
          <font-awesome-icon icon="shopping-cart" class="empty-cart-icon" />
          <p v-if="isAuthenticated">No tienes nada en el carrito. ¡Agrega algo!</p>
          <p v-else>Debes tener sesión iniciada para usar el carrito</p>
          <div class="empty-cart-actions">
            <router-link v-if="isAuthenticated" to="/shop" class="btn btn-outline" @click="closeCart">
              <font-awesome-icon icon="store" class="btn-icon" />
              <span>Ir a la tienda</span>
            </router-link>
            <button v-else class="btn btn-outline" @click="openLoginModal">
              <span class="btn-text">Iniciar Sesión</span>
            </button>
          </div>
        </div>
        
        <div v-else class="cart-items">
          <div v-for="item in cartItems" :key="item.id" class="cart-item">
            <img :src="item.image" :alt="item.name" class="item-image" />
            
            <div class="item-info">
              <div class="item-header">
                <h4 class="item-name">{{ item.name }}</h4>
                <button class="remove-btn" @click="removeFromCart(item.id)" title="Eliminar">
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
              
              <div class="item-price-row">
                <span v-if="item.isOnSale && item.originalPrice" class="price-original">
                  ${{ formatCLP(item.originalPrice) }}
                </span>
                <span :class="{ 'price-sale': item.isOnSale }" class="price">
                  ${{ formatCLP(item.price) }}
                </span>
                <span v-if="item.isOnSale && item.discountPercentage" class="discount-badge">
                  -{{ item.discountPercentage }}%
                </span>
              </div>

              <p v-if="item.stock === 0" class="stock-warning">Agotado. Elimina este producto para continuar.</p>
              <p v-else-if="item.quantity > item.stock" class="stock-warning">
                Stock disponible: {{ item.stock }}.
              </p>
              
              <div class="item-actions">
                <div class="quantity-controls">
                  <button class="qty-btn" @click="decreaseQuantity(item.id)" :disabled="item.quantity <= 1">
                    <font-awesome-icon icon="minus" />
                  </button>
                  <input 
                    type="number" 
                    :value="item.quantity" 
                    @change="updateItemQuantity(item.id, $event.target.value)"
                    min="1"
                    :max="item.stock > 0 ? item.stock : 1"
                    class="qty-input"
                    :disabled="item.stock === 0"
                  >
                  <button class="qty-btn" @click="increaseQuantity(item.id)" :disabled="!canIncreaseQuantity(item)">
                    <font-awesome-icon icon="plus" />
                  </button>
                </div>
                
                <div class="item-total">
                  ${{ formatCLP(item.price * item.quantity) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="cartItems.length > 0" class="cart-footer">
        <div class="cart-total">
          <div class="total-items">{{ cartItemCount }} artículos</div>
          <div class="total-price">Total: ${{ formatCLP(cartTotal) }}</div>
        </div>
        
        <div class="cart-actions">
          <button class="btn btn-clear" @click="clearCart">
            Limpiar
          </button>
          <router-link to="/cart" class="btn btn-view" @click="closeCart">
            Ver Carrito
          </router-link>
          <router-link to="/checkout" class="btn btn-checkout" @click="closeCart">
            Comprar
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useCartStore } from '../stores/cart.js'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth.js'
import { formatCLP } from '../utils/formatters.js'

const cartStore = useCartStore()
const authStore = useAuthStore()
const { cartItems, cartTotal, cartItemCount, isCartOpen, loading, error } = storeToRefs(cartStore)
const { isAuthenticated } = storeToRefs(authStore)

// Emits
const emit = defineEmits(['open-login-modal'])

// Cache timestamp to avoid unnecessary reloads
let lastCartLoadTime = 0
const CART_CACHE_DURATION = 5000 // 5 seconds

// Watch for cart updates to update cache timestamp
watch([cartItems, loading], () => {
  if (!loading.value && cartItems.value.length > 0) {
    lastCartLoadTime = Date.now()
  }
})

// Recargar carrito cuando se abre el sidebar (si está autenticado)
// Only reload if cart hasn't been loaded recently
watch(isCartOpen, async (isOpen) => {
  if (isOpen && isAuthenticated.value && !loading.value) {
    const now = Date.now()
    // Only reload if cache has expired or cart is empty
    if (now - lastCartLoadTime > CART_CACHE_DURATION || cartItems.value.length === 0) {
      await cartStore.loadCart()
      lastCartLoadTime = Date.now()
    }
  }
})

const removeFromCart = async (productId) => {
  await cartStore.removeFromCart(productId)
}

const increaseQuantity = async (productId) => {
  const item = cartItems.value.find(item => item.id === productId)
  if (item && canIncreaseQuantity(item)) {
    await cartStore.updateQuantity(productId, item.quantity + 1)
  }
}

const decreaseQuantity = async (productId) => {
  const item = cartItems.value.find(item => item.id === productId)
  if (item && item.quantity > 1) {
    await cartStore.updateQuantity(productId, item.quantity - 1)
  }
}

const updateItemQuantity = async (productId, newQuantity) => {
  const quantity = parseInt(newQuantity)
  if (quantity > 0) {
    await cartStore.updateQuantity(productId, quantity)
  }
}

const canIncreaseQuantity = (item) => {
  if (!item || item.stock === 0) return false
  return item.quantity < item.stock
}

const clearCart = async () => {
  if (confirm('¿Estás seguro de que quieres limpiar el carrito?')) {
    await cartStore.clearCart()
  }
}

const closeCart = () => {
  cartStore.closeCart()
}

const retryLoadCart = async () => {
  await cartStore.loadCart()
}

const openLoginModal = () => {
  closeCart() // Cerrar el carrito primero
  // Emitir evento para abrir el modal de login
  emit('open-login-modal')
}
</script>

<style scoped>
.cart-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  opacity: 0;
  animation: fadeIn 0.3s forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

.cart-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100%;
  background: var(--color-black);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
}

.cart-sidebar.is-open {
  transform: translateX(0);
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-primary);
  background: var(--color-black);
}

.cart-header h2 {
  margin: 0;
  color: var(--color-white);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cart-title-icon {
  color: var(--color-primary);
  font-size: 1.1rem;
  transition: color var(--transition-normal);
}

.cart-header:hover .cart-title-icon {
  color: var(--color-quaternary);
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  cursor: pointer;
  color: var(--color-white);
  line-height: 1;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
  color: var(--color-primary);
}

.close-icon {
  font-size: 1.2rem;
  color: var(--color-white);
  transition: color var(--transition-normal);
}

.close-btn:hover .close-icon {
  color: var(--color-primary);
}

.cart-content {
  flex: 1;
  overflow-y: auto;
}

.loading-state,
.empty-cart,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  gap: 1rem;
}

.loading-spinner {
  font-size: 2rem;
  color: var(--color-white);
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  margin: 0;
  color: var(--color-white);
  font-size: 0.95rem;
}

.empty-cart-icon {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
  color: var(--color-primary);
  opacity: 0.5;
  transition: color var(--transition-normal);
}

.empty-cart:hover .empty-cart-icon {
  color: var(--color-quaternary);
  opacity: 0.7;
}

.empty-cart p {
  margin: 0;
  color: var(--color-white);
  font-size: 1rem;
  line-height: 1.4;
}

.empty-cart-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 0.5rem);
  width: 100%;
  max-width: 300px;
}

.empty-cart-actions .btn {
  width: 100%;
  justify-content: center;
}

.error-icon {
  font-size: 3rem;
  color: #dc3545;
  opacity: 0.7;
}

.error-state p {
  margin: 0 0 1.5rem 0;
  color: var(--color-quaternary);
  font-size: 1.1rem;
}

.cart-items {
  padding: 1rem;
}

.cart-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-primary);
  position: relative;
}

.cart-item:last-child {
  border-bottom: none;
}

.item-image {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.item-name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-white);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.remove-btn {
  background: transparent;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover {
  opacity: 0.7;
}

.item-price-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.stock-warning {
  margin: 0 0 0.5rem 0;
  color: #dc3545;
  font-size: 0.75rem;
}

.price {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 0.875rem;
}

.price-sale {
  color: #dc3545;
}

.price-original {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: line-through;
}

.discount-badge {
  background: #dc3545;
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
}

.qty-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  font-size: 0.75rem;
}

.qty-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-white);
}

.qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.qty-input {
  width: 40px;
  text-align: center;
  border: none;
  padding: 0.25rem;
  font-size: 0.875rem;
  background: transparent;
  color: var(--color-white);
  appearance: textfield;
  -moz-appearance: textfield;
}

.qty-input::-webkit-inner-spin-button,
.qty-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.item-total {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-white);
}

.cart-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem;
}

.cart-total {
  margin-bottom: 1rem;
}

.total-items {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.25rem;
}

.total-price {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-white);
}

.cart-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn {
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: background 0.2s;
  font-size: 0.875rem;
}

.btn-clear {
  background: #dc3545;
  color: white;
}

.btn-clear:hover {
  background: #c82333;
}

.btn-view {
  background: #17a2b8;
  color: white;
}

.btn-view:hover {
  background: #138496;
}

.btn-checkout {
  background: #667eea;
  color: white;
}

.btn-checkout:hover {
  background: #5568d3;
}

@media (max-width: 480px) {
  .cart-sidebar {
    width: 100%;
  }
}
</style> 