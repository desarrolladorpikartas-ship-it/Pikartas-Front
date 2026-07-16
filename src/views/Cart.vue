<template>
  <div class="cart">
    <div class="container">
      <div class="cart-header">
        <h1>
          <font-awesome-icon icon="shopping-cart" class="header-icon" />
          Mi Carrito
        </h1>
        <p v-if="cartItems.length > 0">{{ cartItemCount }} artículos en tu carrito</p>
      </div>

      <div v-if="cartItems.length === 0" class="empty-cart">
        <div class="empty-cart-icon">
          <font-awesome-icon icon="shopping-cart" class="empty-cart-icon-svg" />
        </div>
        <h2>Tu carrito está vacío</h2>
        <p>¡Empieza a agregar productos increíbles!</p>
        <router-link to="/shop" class="btn btn-primary btn-lg">
          <font-awesome-icon icon="store" class="btn-icon" />
          Ir a la Tienda
        </router-link>
      </div>

      <div v-else class="cart-content">
        <div class="cart-items">
          <div class="cart-item" v-for="item in cartItems" :key="item.id">
            <img :src="item.image" :alt="item.name" class="item-image" />
            
            <div class="item-info">
              <h3 class="item-name">{{ item.name }}</h3>
              <p v-if="item.stock === 0" class="stock-warning">Agotado. Elimina este producto o vuelve a la tienda.</p>
              <p v-else-if="item.quantity > item.stock" class="stock-warning">
                Stock disponible: {{ item.stock }}. Ajusta la cantidad para continuar.
              </p>
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
            </div>
            
            <div class="item-actions">
              <div class="quantity-controls">
                <button 
                  class="qty-btn" 
                  @click="decreaseQuantity(item.id)" 
                  :disabled="item.quantity <= 1"
                >
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
              
              <button class="remove-btn" @click="removeFromCart(item.id)" title="Eliminar">
                <font-awesome-icon icon="trash" />
              </button>
            </div>
          </div>
        </div>

        <div class="cart-summary">
          <div class="summary-card">
            <h3>Resumen</h3>
            
            <div class="summary-line">
              <span>{{ cartItemCount }} artículos</span>
              <span>${{ formatCLP(cartTotal) }}</span>
            </div>
            
            <div class="summary-line">
              <span>Envío</span>
              <span class="muted">En checkout (según destino)</span>
            </div>
            
            <hr>
            
            <div class="summary-line total">
              <span>Subtotal</span>
              <span>${{ formatCLP(cartTotal) }}</span>
            </div>
            
            <p class="cart-shipping-hint">El envío se cobra según ciudad al finalizar la compra.</p>
            
            <div class="cart-actions">
              <router-link to="/checkout" class="btn btn-primary btn-full btn-lg">
                Comprar
              </router-link>
              <router-link to="/shop" class="btn btn-outline btn-full btn-lg">
                Seguir Comprando
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCartStore } from '../stores/cart.js'
import { storeToRefs } from 'pinia'
import { formatCLP } from '../utils/formatters.js'
const cartStore = useCartStore()
const { cartItems, cartTotal, cartItemCount } = storeToRefs(cartStore)

// Methods
const removeFromCart = async (productId) => {
  if (confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
    await cartStore.removeFromCart(productId)
  }
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
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.cart {
  position: relative;
  padding-top: calc(var(--header-height) + 8rem);
  padding-bottom: 80px;
  min-height: 100vh;
  background: transparent;
  color: var(--color-white);
  font-family: var(--font-family-primary);
}

.cart-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid var(--color-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  animation: slideInUp 0.8s ease-out 0.2s both;
}

.cart-header h1 {
  font-size: clamp(1.8rem, 4vw, 3rem);
  margin: 0 0 0.5rem 0;
  color: var(--color-white);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.header-icon {
  color: var(--icon-cart-header);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}

.cart-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.05rem;
}

.empty-cart {
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid var(--color-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  animation: slideInUp 0.8s ease-out 0.35s both;
}

.empty-cart-icon {
  font-size: 4rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-cart-icon-svg {
  color: var(--icon-cart-empty);
  opacity: 0.85;
}

.empty-cart h2 {
  margin: 0 0 0.75rem 0;
  color: var(--color-white);
  font-size: 1.75rem;
  font-weight: 600;
}

.empty-cart p {
  margin: 0 0 2rem 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
}

.btn-icon {
  margin-right: 0.5rem;
}

.cart-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 2rem;
}

.cart-items {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 1.25rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: slideInUp 0.8s ease-out 0.35s both;
}

.cart-item {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  align-items: center;
}

.cart-item:last-child {
  border-bottom: none;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.item-info {
  min-width: 0;
}

.item-name {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-white);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-price-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stock-warning {
  margin: 0 0 0.5rem 0;
  color: var(--color-error);
  font-size: 0.85rem;
}

.price {
  font-weight: 600;
  color: var(--color-primary);
}

.price-sale {
  color: var(--color-error);
}

.price-original {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: line-through;
}

.discount-badge {
  background: var(--color-error);
  color: var(--color-white);
  padding: 0.125rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  transition: background var(--transition-fast);
}

.qty-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-white);
}

.qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.qty-input {
  width: 50px;
  text-align: center;
  border: none;
  padding: 0.25rem;
  font-size: 0.875rem;
  font-family: var(--font-family-primary);
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
  font-size: 1rem;
  color: var(--color-white);
  min-width: 80px;
  text-align: right;
}

.remove-btn {
  background: transparent;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background var(--transition-fast);
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-white);
}

.cart-summary {
  position: sticky;
  top: calc(var(--header-height) + 1.5rem);
  height: fit-content;
}

.summary-card {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--color-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  animation: slideInUp 0.8s ease-out 0.45s both;
}

.summary-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-white);
}

.summary-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.92);
}

.free-shipping {
  color: var(--color-success);
  font-weight: 600;
}

.summary-card hr {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin: 1rem 0;
}

.summary-line.total {
  font-size: 1.125rem;
  font-weight: 700;
  margin-top: 0.5rem;
  color: var(--color-white);
}

.muted {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
}

.cart-shipping-hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0.5rem 0 0 0;
  line-height: var(--line-height-relaxed);
}

.shipping-notice {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  padding: 0.75rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.95);
}

.cart-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .cart-content {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 768px) {
  .cart-item {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .item-image {
    width: 100%;
    height: 200px;
  }

  .item-actions {
    flex-wrap: wrap;
    justify-content: space-between;
  }
}
</style> 