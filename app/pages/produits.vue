<template>
  <main class="container">
    <h1>Catalogue ChampaShop</h1>

    <!-- Nouvelle barre de recherche -->
    <div class="search-bar">
      <input 
        type="search" 
        :value="route.query.q" 
        placeholder="Rechercher un produit (ex: Samsung, parfum...)" 
        class="search-input" 
        @input="handleSearch"
      >
    </div>

    <!-- Barre de filtres et tris -->
    <div class="filters-bar">
      <div class="filter-group">
        <label for="category">Catégorie :</label>
        <select id="category" :value="currentCategory" @change="handleCategoryChange">
          <option value="">Toutes les catégories</option>
          <option v-for="cat in categories || []" :key="cat.slug" :value="cat.slug">
            {{ cat.name }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Prix :</label>
        <input type="number" placeholder="Min" :value="route.query.minPrice" class="price-input" @change="updateFilters('minPrice', ($event.target as HTMLInputElement).value)" >
        <span>à</span>
        <input type="number" placeholder="Max" :value="route.query.maxPrice" class="price-input" @change="updateFilters('maxPrice', ($event.target as HTMLInputElement).value)" >
      </div>

      <div class="filter-group">
        <label for="sort">Trier :</label>
        <select id="sort" :value="currentSort" @change="handleSortChange">
          <option value="">Pertinence</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="title-asc">Nom (A-Z)</option>
          <option value="title-desc">Nom (Z-A)</option>
          <option value="rating-desc">Mieux notés</option>
        </select>
      </div>
    </div>
    
    <div v-if="pending" class="product-grid">
      <ProductSkeleton v-for="n in 12" :key="n" />
    </div>

    <div v-else-if="error" class="error-state">
      <p>Une erreur est survenue lors du chargement du catalogue.</p>
      <button class="retry-btn" @click="refresh()">Réessayer</button>
    </div>

    <div v-else-if="!paginatedProducts.length" class="empty-state">
      <p>Aucun produit ne correspond à vos critères.</p>
      <button class="retry-btn" @click="resetFilters()">Réinitialiser les filtres</button>
    </div>

    <div v-else>
      <div class="product-grid">
        <ProductCard 
          v-for="product in paginatedProducts" 
          :key="product.id" 
          :product="product" 
        />
      </div>

      <div class="pagination">
        <button :disabled="page === 1" @click="updateFilters('page', page - 1)">Précédent</button>
        <span class="page-info">Page {{ page }} sur {{ totalPages }}</span>
        <button :disabled="page === totalPages" @click="updateFilters('page', page + 1)">Suivant</button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from '#app'

const route = useRoute()
const router = useRouter()

interface Product {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  rating?: number;
  discountPercentage?: number;
}

interface DummyJsonResponse {
  products: Product[];
  total: number;
}

interface Category {
  slug: string;
  name: string;
}

const { data: categories } = await useFetch<Category[]>('https://dummyjson.com/products/categories')

const limit = 12
const page = computed(() => Number(route.query.page) || 1)
const currentCategory = computed(() => route.query.category as string || '')
const currentSort = computed(() => {
  if (!route.query.sortBy) return ''
  return `${route.query.sortBy}-${route.query.order || 'asc'}`
})

const apiUrl = computed(() => {
  const base = currentCategory.value ? `https://dummyjson.com/products/category/${currentCategory.value}` : 'https://dummyjson.com/products'
  return `${base}?limit=0`
})

const { data, pending, error, refresh } = await useFetch<DummyJsonResponse>(() => apiUrl.value)

// -- LOGIQUE LOCALE DE FILTRAGE ET DE TRI --
const processedProducts = computed(() => {
  let result = data.value?.products || []

  // 1. Filtrage par recherche plein texte
  const searchQuery = route.query.q as string
  if (searchQuery) {
    const lowerQ = searchQuery.toLowerCase()
    result = result.filter(p => p.title.toLowerCase().includes(lowerQ))
  }

  // 2. Filtrage par prix
  const min = Number(route.query.minPrice)
  const max = Number(route.query.maxPrice)
  if (min) result = result.filter(p => p.price >= min)
  if (max) result = result.filter(p => p.price <= max)

  // 3. Tri local
  const sortBy = route.query.sortBy as string
  const order = route.query.order as string
  
  if (sortBy && order) {
    result = [...result].sort((a: Product, b: Product) => {
      const key = sortBy as keyof Product
      const valA = a[key]
      const valB = b[key]
      if (valA === undefined || valB === undefined) return 0
      if (valA < valB) return order === 'asc' ? -1 : 1
      if (valA > valB) return order === 'asc' ? 1 : -1
      return 0
    })
  }
  
  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(processedProducts.value.length / limit)))

const paginatedProducts = computed(() => {
  const start = (page.value - 1) * limit
  return processedProducts.value.slice(start, start + limit)
})

// -- GESTION DES ÉVÉNEMENTS ET DU DEBOUNCE --
let debounceTimeout: ReturnType<typeof setTimeout>

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  // On annule le timer précédent s'il y en avait un (l'utilisateur tape encore)
  clearTimeout(debounceTimeout)
  
  // On crée un nouveau timer de 300ms
  debounceTimeout = setTimeout(() => {
    updateFilters('q', target.value)
  }, 300)
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  updateFilters('category', target.value)
}

const handleSortChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  updateSort(target.value)
}

const updateFilters = (key: string, value: string | number | undefined) => {
  const query = { ...route.query }
  
  if (value) {
    query[key] = String(value)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete query[key]
  }
  
  if (key !== 'page') {
    delete query.page
  }
  
  router.push({ query })
}

const updateSort = (sortValue: string) => {
  const query = { ...route.query }
  if (!sortValue) {
    delete query.sortBy
    delete query.order
  } else {
    const [sortBy, order] = sortValue.split('-')
    if (sortBy) query.sortBy = sortBy
    if (order) query.order = order
  }
  delete query.page
  router.push({ query })
}

const resetFilters = () => router.push({ query: {} })
</script>

<style scoped>
/* Vos styles précédents restent identiques */
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
h1 { text-align: center; margin-bottom: 2rem; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 2rem; }
.pagination { display: flex; justify-content: center; align-items: center; margin-top: 3rem; gap: 1rem; }
button { padding: 0.5rem 1rem; background-color: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; }
button:disabled { background-color: #bdc3c7; cursor: not-allowed; }
button:not(:disabled):hover { background-color: #34495e; }
.page-info { font-weight: bold; }
.error-state, .empty-state { text-align: center; padding: 3rem; background-color: #fff3f3; border-radius: 8px; border: 1px solid #ffcdd2; margin-top: 2rem; }
.empty-state { background-color: #f8f9fa; border-color: #e9ecef; }
.retry-btn { margin-top: 1rem; background-color: #e74c3c; }
.retry-btn:hover { background-color: #c0392b; }
.filters-bar { display: flex; justify-content: space-between; align-items: center; background-color: #f8f9fa; padding: 1rem 2rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #eaeaea; flex-wrap: wrap; gap: 1rem;}
.filter-group { display: flex; align-items: center; gap: 0.5rem; }
select { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; outline: none; }
select:focus { border-color: #2c3e50; }
.price-input { width: 70px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }

/* Styles pour la barre de recherche */
.search-bar {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}
.search-input {
  width: 100%;
  max-width: 600px;
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
  border: 2px solid #eaeaea;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: #2c3e50;
}
</style>