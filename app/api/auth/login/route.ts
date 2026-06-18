import { NextRequest, NextResponse } from 'next/server';
import { handleCors, corsResponse } from '@/lib/cors';

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
    const { email, password } = body;

    if (!email || !password) {
      return corsResponse(
        NextResponse.json(
          {
            success: false,
            error: {
              message: 'Email dan password harus diisi',
            },
          },
          { status: 400 }
        ),
        { origin: '*' }
      );
    }

    // TODO: Implement actual login logic
    // - Check if user exists
    // - Verify password
    // - Generate JWT token
    // - Return token

    return corsResponse(
      NextResponse.json(
        {
          success: true,
          data: {
            message: 'Login berhasil',
            user: {
              email,
            },
            token: 'jwt-token-here',
          },
        },
        { status: 200 }
      ),
      { origin: '*' }
    );
  } catch (error) {
    console.error('Login error:', error);
    return corsResponse(
      NextResponse.json(
        {
          success: false,
          error: {
            message: 'Terjadi kesalahan saat login',
          },
        },
        { status: 500 }
      ),
      { origin: '*' }
    );
  }
}
