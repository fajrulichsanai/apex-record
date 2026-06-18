import { NextRequest, NextResponse } from 'next/server';
import { handleCors, corsResponse } from '@/lib/cors';

const BACKEND_API = process.env.BACKEND_API || 'http://localhost:3001';

export async function OPTIONS(request: NextRequest) {
  return handleCors(request, {
    origin: '*',
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }) || new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const corsErr = handleCors(request);
    if (corsErr) return corsErr;

    const body = await request.json();
    console.log('Frontend received body:', body);
    const { token } = body;

    // Validation
    if (!token || token.trim() === '') {
      console.log('Token validation failed:', { token });
      return corsResponse(
        NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Token verifikasi tidak boleh kosong',
            },
          },
          { status: 400 }
        ),
        { origin: '*' }
      );
    }

    console.log('Forwarding to backend with token:', token);

    // Forward to backend
    const backendRes = await fetch(`${BACKEND_API}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    console.log('Backend response status:', backendRes.status);
    const backendData = await backendRes.json();
    console.log('Backend response data:', backendData);

    // Return backend response
    return corsResponse(
      NextResponse.json(backendData, { status: backendRes.status }),
      { origin: '*' }
    );
  } catch (error) {
    console.error('Verify email error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat verifikasi email';

    return corsResponse(
      NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: errorMessage,
          },
        },
        { status: 500 }
      ),
      { origin: '*' }
    );
  }
}
