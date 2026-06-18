# CORS Setup untuk ApexRecord

Dokumentasi lengkap untuk konfigurasi CORS di Next.js project ApexRecord.

## Overview

CORS (Cross-Origin Resource Sharing) sudah dikonfigurasi dengan tiga layer:

1. **Middleware** - Menangani CORS secara global
2. **Next Config Headers** - Menambahkan CORS headers di production
3. **API Route Handlers** - CORS granular per endpoint

## File-file yang dibuat/dimodifikasi

### 1. `middleware.ts` (Baru)
Middleware global yang menangani CORS untuk semua request:
- Menambahkan CORS headers ke setiap response
- Menangani preflight OPTIONS request
- Set `Access-Control-Max-Age` ke 24 jam

### 2. `lib/cors.ts` (Baru)
Utility helper untuk CORS yang reusable:
- `corsHeaders(options)` - Generate CORS headers
- `handleCors(request, options)` - Handle OPTIONS request
- `corsResponse(response, options)` - Add CORS headers ke response

### 3. `next.config.ts` (Dimodifikasi)
Menambahkan headers configuration:
- Set CORS headers untuk semua `/api/*` endpoints
- Support untuk preflight requests

### 4. `app/api/auth/register/route.ts` (Baru)
Contoh implementasi API endpoint dengan CORS:
```typescript
// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) { ... }

// Handle POST request dengan CORS
export async function POST(request: NextRequest) { ... }
```

### 5. `app/page.tsx` (Dimodifikasi)
Update untuk menggunakan API lokal:
- Fetch endpoint dari `http://localhost:3000/api/auth/register`
- Menghindari CORS issue karena same-origin

## Konfigurasi CORS

### Default Headers
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: false
Access-Control-Max-Age: 86400
```

### Customization

Untuk mengubah CORS settings per endpoint, edit di `app/api/[route]/route.ts`:

```typescript
export async function OPTIONS(request: NextRequest) {
  return handleCors(request, {
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 3600,
  }) || new NextResponse(null, { status: 200 });
}
```

## Testing CORS

### 1. Dengan curl
```bash
# Preflight request
curl -X OPTIONS http://localhost:3000/api/auth/register \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Actual POST request
curl -X POST http://localhost:3000/api/auth/register \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' \
  -v
```

### 2. Dengan browser DevTools
- Buka Console tab
- Lihat Network tab saat melakukan request
- Cek Response Headers untuk CORS headers

## Environment Variables

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://210.72.190.195:3000
```

Untuk development, frontend dan API bisa same-origin (`http://localhost:3000`).

## Troubleshooting

### CORS Error di browser
1. Cek apakah OPTIONS request berhasil (status 200)
2. Verify CORS headers di Response Headers
3. Ensure Origin header match dengan `Access-Control-Allow-Origin`

### "No 'Access-Control-Allow-Origin' header"
- Middleware atau headers config tidak aktif
- Cek apakah file `middleware.ts` ada di root `app/` folder
- Restart dev server

### Credentials tidak bekerja
- Jika `credentials: true`, set `origin` spesifik (bukan `*`)
- Update `corsResponse(response, { credentials: true })`

## Production Notes

1. Jangan gunakan `origin: '*'` jika menggunakan `credentials: true`
2. Specify allowed origins explicitly di production
3. Consider rate limiting untuk OPTIONS requests
4. Monitor CORS errors di production

## Next Steps

1. Implement actual registration logic di `/api/auth/register`
2. Add database integration
3. Add email verification
4. Implement login endpoint
5. Add more API routes dengan CORS configuration sesuai kebutuhan
