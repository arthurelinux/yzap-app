// Grupo 6 — Catálogo: categorias + produtos (contrato § Grupo 6, linhas 227-252).
// Produtos usam multipart (POST/PUT); ajuste rápido de estoque é PATCH JSON.
import { api, qs, newIdempotencyKey } from './client'
import type { ListEnvelope } from '@/composables/useList'

export interface Category {
  id: number
  name: string
  slug?: string
  is_active?: boolean
  position?: number
  products_count?: number
}

export interface ProductVariant {
  id: number
  code?: string | null
  price?: number | string
  promotional_price?: number | string | null
  stock?: number | null
  is_active?: boolean
  image_url?: string | null
}

export interface ProductImage {
  id: number
  url: string
  is_primary?: boolean
  position?: number
}

export interface Product {
  id: number
  category_id?: number | null
  category_name?: string | null
  code?: string | null
  name: string
  description?: string | null
  price: number | string
  promotional_price?: number | string | null
  image_url?: string | null
  images?: ProductImage[]
  uses_variants?: boolean
  variants?: ProductVariant[]
  stock?: number | null
  stock_min?: number | null
  is_active?: boolean
  is_digital?: boolean
  position?: number
}

export interface ProductPayload {
  name?: string
  price?: string | number
  category_id?: number | null
  code?: string
  description?: string
  promotional_price?: string | number
  is_active?: boolean
  stock?: number | null
  stock_min?: number | null
}

export const catalogApi = {
  // ---------- Categorias ----------
  categories: () => api.get<{ data: Category[] }>('/categories'),

  createCategory(body: { name: string; is_active?: boolean }) {
    return api.post<{ data: Category }>('/categories', body)
  },

  updateCategory(id: number | string, body: { name?: string; is_active?: boolean }) {
    return api.put<{ data: Category }>(`/categories/${id}`, body)
  },

  removeCategory(id: number | string) {
    return api.del<{ data: { removed: boolean } }>(`/categories/${id}`)
  },

  reorderCategories(ids: number[]) {
    return api.patch<{ data: { reordered: boolean } }>('/categories/reorder', { ids })
  },

  // ---------- Produtos ----------
  products(params: {
    search?: string
    category_id?: number
    is_active?: boolean
    page?: number
    per_page?: number
  }) {
    return api.get<ListEnvelope<Product>>(`/products${qs(params)}`)
  },

  product(id: number | string) {
    return api.get<{ data: Product }>(`/products/${id}`)
  },

  /** POST multipart: name, price (texto BR ok), image? (4 MB) etc. */
  createProduct(fd: FormData, onProgress?: (pct: number) => void) {
    return api.upload<{ data: Product }>('/products', fd, 'POST', { onProgress })
  },

  /**
   * PUT /products/{product} — ENVIE JSON p/ escalares.
   * NOTA (mesmo defeito de PUT /store/settings): o PHP não parseia
   * multipart em PUT, então a imagem NÃO vai aqui — envie depois por
   * `addImages` (POST /products/{id}/images, multipart POST funciona).
   */
  updateProduct(id: number | string, body: Record<string, unknown>) {
    return api.put<{ data: Product }>(`/products/${id}`, body)
  },

  removeProduct(id: number | string) {
    return api.del<{ data: { removed: boolean } }>(`/products/${id}`)
  },

  /** PATCH /products/{product}/stock — ajuste rápido SEM movimento (permissão products). */
  quickStock(id: number | string, stock: number | null) {
    return api.patch<{ data: { product_id: number; stock: number | null } }>(
      `/products/${id}/stock`,
      { stock },
    )
  },

  reorderProducts(ids: number[]) {
    return api.patch<{ data: { reordered: boolean } }>('/products/reorder', { ids })
  },

  /** GET /products/{product}/variants — mesmo JSON do painel (somente leitura no v1). */
  variants(id: number | string) {
    return api.get<{ data: { product: Product; groups: unknown[]; variants: ProductVariant[] } }>(
      `/products/${id}/variants`,
    )
  },

  /** POST /products/{product}/images — multipart `images[]`. */
  addImages(id: number | string, files: File[], onProgress?: (pct: number) => void) {
    const fd = new FormData()
    for (const f of files) fd.append('images[]', f)
    return api.upload<{ data: ProductImage[] }>(`/products/${id}/images`, fd, 'POST', {
      onProgress,
    })
  },

  setPrimaryImage(imageId: number | string) {
    return api.patch<{ data: { image_id: number; is_primary: boolean } }>(
      `/images/${imageId}/primary`,
    )
  },

  removeImage(imageId: number | string) {
    return api.del<{ data: { removed: boolean } }>(`/images/${imageId}`)
  },
}

/** Monta multipart de produto para CREATE (POST). */
export function productFormData(
  form: {
    name: string
    price: string
    category_id: number | null
    code: string
    description: string
    promotional_price: string
    is_active: boolean
    stock: string
    stock_min: string
  },
  image: File | null,
): FormData {
  const fd = new FormData()
  if (form.name.trim()) fd.append('name', form.name.trim())
  if (form.price !== '') fd.append('price', form.price)
  if (form.category_id) fd.append('category_id', String(form.category_id))
  if (form.code.trim()) fd.append('code', form.code.trim())
  if (form.description) fd.append('description', form.description)
  if (form.promotional_price !== '')
    fd.append('promotional_price', form.promotional_price)
  fd.append('is_active', form.is_active ? '1' : '0')
  if (form.stock !== '') fd.append('stock', form.stock)
  if (form.stock_min !== '') fd.append('stock_min', form.stock_min)
  if (image) fd.append('image', image)
  return fd
}

/** JSON de UPDATE (PUT) — mesmo subconjunto de campos do POST. */
export function productJsonBody(
  form: {
    name: string
    price: string
    category_id: number | null
    code: string
    description: string
    promotional_price: string
    is_active: boolean
    stock: string
    stock_min: string
  },
  original?: Partial<Product>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (form.name.trim() && form.name !== original?.name) body.name = form.name.trim()
  if (form.price !== '' && String(original?.price ?? '') !== form.price) body.price = form.price
  if ((original?.category_id ?? null) !== form.category_id && form.category_id)
    body.category_id = form.category_id
  if (form.code.trim() && form.code !== (original?.code ?? '')) body.code = form.code.trim()
  if (form.description !== (original?.description ?? '')) body.description = form.description
  if (form.promotional_price !== String(original?.promotional_price ?? ''))
    body.promotional_price = form.promotional_price
  if (form.is_active !== (original?.is_active ?? true))
    body.is_active = form.is_active ? '1' : '0'
  if (form.stock !== '' && Number(form.stock) !== (original?.stock ?? null))
    body.stock = form.stock
  if (form.stock_min !== '' && Number(form.stock_min) !== (original?.stock_min ?? null))
    body.stock_min = form.stock_min
  return body
}

/** Chave idempotente p/ escritas de estoque/caixa/financeiro (contrato exige). */
export const idemKey = newIdempotencyKey
