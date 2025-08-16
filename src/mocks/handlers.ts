/**
 * Handlers MSW pour intercepter les requêtes API pendant les tests
 * Support pour Supabase, Stripe, et APIs externes
 */

import { http, HttpResponse } from 'msw'
import { ProductFactory } from '@/test-utils/factories/ProductFactory'
import { UserFactory } from '@/test-utils/factories/UserFactory'
import { CartFactory } from '@/test-utils/factories/CartFactory'

// Base URLs
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgirafriwoildqcwtjm.supabase.co'
const STRIPE_API_URL = 'https://api.stripe.com'

export const handlers = [
  // ==========================================
  // SUPABASE AUTH HANDLERS
  // ==========================================
  
  // POST /auth/v1/token (login)
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json() as any
    
    if (body.email === 'test@example.com' && body.password === 'correct-password') {
      const user = UserFactory.authenticated()
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: user.user,
      })
    }
    
    return HttpResponse.json(
      { error: 'Invalid login credentials' },
      { status: 400 }
    )
  }),
  
  // POST /auth/v1/signup
  http.post(`${SUPABASE_URL}/auth/v1/signup`, async ({ request }) => {
    const body = await request.json() as any
    
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { error: 'User already registered' },
        { status: 422 }
      )
    }
    
    const user = UserFactory.authenticated({ user: { email: body.email } })
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: user.user,
    })
  }),
  
  // GET /auth/v1/user
  http.get(`${SUPABASE_URL}/auth/v1/user`, ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.includes('Bearer')) {
      return HttpResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
    }
    
    const user = UserFactory.authenticated()
    return HttpResponse.json(user.user)
  }),
  
  // ==========================================
  // SUPABASE REST API HANDLERS
  // ==========================================
  
  // GET /rest/v1/products
  http.get(`${SUPABASE_URL}/rest/v1/products`, ({ request }) => {
    const url = new URL(request.url)
    const select = url.searchParams.get('select')
    const category = url.searchParams.get('category')
    
    let products = ProductFactory.mixedCategories()
    
    // Filtrage par catégorie si spécifié
    if (category) {
      products = products.filter(p => p.category === category)
    }
    
    return HttpResponse.json(products)
  }),
  
  // GET /rest/v1/products (single product)
  http.get(`${SUPABASE_URL}/rest/v1/products`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (id) {
      const product = ProductFactory.simple({ id })
      return HttpResponse.json([product])
    }
    
    return HttpResponse.json(ProductFactory.mixedCategories())
  }),
  
  // POST /rest/v1/products
  http.post(`${SUPABASE_URL}/rest/v1/products`, async ({ request }) => {
    const body = await request.json() as any
    const product = ProductFactory.simple(body)
    
    return HttpResponse.json(product, { status: 201 })
  }),
  
  // GET /rest/v1/cart_items
  http.get(`${SUPABASE_URL}/rest/v1/cart_items`, ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return HttpResponse.json(
        { error: 'RLS: access denied' },
        { status: 403 }
      )
    }
    
    const cart = CartFactory.forUser('user-123', 2)
    return HttpResponse.json(cart.items)
  }),
  
  // POST /rest/v1/cart_items
  http.post(`${SUPABASE_URL}/rest/v1/cart_items`, async ({ request }) => {
    const body = await request.json() as any
    const cartItem = CartFactory.createCartItem(body)
    
    return HttpResponse.json(cartItem, { status: 201 })
  }),
  
  // PATCH /rest/v1/cart_items
  http.patch(`${SUPABASE_URL}/rest/v1/cart_items`, async ({ request }) => {
    const body = await request.json() as any
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    const updatedItem = CartFactory.createCartItem({ id, ...body })
    return HttpResponse.json(updatedItem)
  }),
  
  // DELETE /rest/v1/cart_items
  http.delete(`${SUPABASE_URL}/rest/v1/cart_items`, ({ request }) => {
    return HttpResponse.json({}, { status: 204 })
  }),
  
  // GET /rest/v1/profiles
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return HttpResponse.json(
        { error: 'RLS: access denied' },
        { status: 403 }
      )
    }
    
    const user = UserFactory.authenticated()
    return HttpResponse.json([user.profile])
  }),
  
  // ==========================================
  // SUPABASE RPC HANDLERS
  // ==========================================
  
  // POST /rest/v1/rpc/get_cart_total
  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_cart_total`, async ({ request }) => {
    const body = await request.json() as any
    const cart = CartFactory.forUser(body.user_id || 'user-123', 2)
    const total = CartFactory.calculateTotal(cart)
    
    return HttpResponse.json(total)
  }),
  
  // POST /rest/v1/rpc/check_admin_role
  http.post(`${SUPABASE_URL}/rest/v1/rpc/check_admin_role`, ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (authHeader?.includes('admin-token')) {
      return HttpResponse.json(true)
    }
    
    return HttpResponse.json(false)
  }),
  
  // POST /rest/v1/rpc/migrate_guest_cart
  http.post(`${SUPABASE_URL}/rest/v1/rpc/migrate_guest_cart`, async ({ request }) => {
    const body = await request.json() as any
    
    return HttpResponse.json({
      success: true,
      items_migrated: 2,
      cart_id: body.user_id || 'user-123',
    })
  }),
  
  // ==========================================
  // SUPABASE STORAGE HANDLERS
  // ==========================================
  
  // POST /storage/v1/object/{bucket}
  http.post(`${SUPABASE_URL}/storage/v1/object/:bucket/*`, async ({ request, params }) => {
    const bucket = params.bucket as string
    const path = request.url.split(bucket + '/')[1]
    
    return HttpResponse.json({
      Id: 'mock-file-id',
      Key: `${bucket}/${path}`,
      ETag: '"mock-etag"',
      Size: 1024,
    })
  }),
  
  // GET /storage/v1/object/public/{bucket}
  http.get(`${SUPABASE_URL}/storage/v1/object/public/:bucket/*`, ({ params }) => {
    const bucket = params.bucket as string
    
    // Retourne une image mock
    return HttpResponse.arrayBuffer(
      new ArrayBuffer(8),
      {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': '8',
        },
      }
    )
  }),
  
  // ==========================================
  // STRIPE HANDLERS
  // ==========================================
  
  // POST /v1/checkout/sessions
  http.post(`${STRIPE_API_URL}/v1/checkout/sessions`, async ({ request }) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.includes('sk_test_')) {
      return HttpResponse.json(
        { error: { message: 'Invalid API key' } },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      id: 'cs_test_mock_session_id',
      url: 'https://checkout.stripe.com/pay/cs_test_mock_session_id',
      payment_status: 'unpaid',
      status: 'open',
    })
  }),
  
  // GET /v1/checkout/sessions/{id}
  http.get(`${STRIPE_API_URL}/v1/checkout/sessions/:id`, ({ params }) => {
    const sessionId = params.id as string
    
    return HttpResponse.json({
      id: sessionId,
      payment_status: 'paid',
      status: 'complete',
      customer_details: {
        email: 'test@example.com',
      },
      metadata: {
        cart_id: 'cart-123',
        user_id: 'user-123',
      },
    })
  }),
  
  // POST /v1/webhooks
  http.post(`${STRIPE_API_URL}/v1/webhooks`, async ({ request }) => {
    return HttpResponse.json({ received: true })
  }),
  
  // ==========================================
  // API EXTERNES (COLISSIMO, ETC.)
  // ==========================================
  
  // API Colissimo pour validation d'adresse
  http.post('https://ws.colissimo.fr/sls-ws/SlsServiceWS/2.0', async ({ request }) => {
    const body = await request.text()
    
    if (body.includes('75001')) {
      return HttpResponse.xml(`<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <checkAddressResponse>
              <return>
                <isValid>true</isValid>
                <normalizedAddress>
                  <street>1 Rue de la Paix</street>
                  <city>Paris</city>
                  <postalCode>75001</postalCode>
                </normalizedAddress>
              </return>
            </checkAddressResponse>
          </soap:Body>
        </soap:Envelope>`)
    }
    
    return HttpResponse.xml(`<?xml version="1.0" encoding="UTF-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <checkAddressResponse>
            <return>
              <isValid>false</isValid>
            </return>
          </checkAddressResponse>
        </soap:Body>
      </soap:Envelope>`)
  }),
  
  // ==========================================
  // HANDLERS D'ERREUR ET FALLBACK
  // ==========================================
  
  // Fallback pour requêtes non gérées
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }),
]
