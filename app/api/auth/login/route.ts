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

    // Validation
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
    // - Query database to find user by email
    // - Verify password hash
    // - Generate JWT token
    // - Return token

    // Temporary mock: accept any email/password combination
    if (email && password.length > 0) {
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
    }

    return corsResponse(
      NextResponse.json(
        {
          success: false,
          error: {
            message: 'Email atau password salah',
          },
        },
        { status: 401 }
      ),
      { origin: '*' }
    );
  } catch (error) {
    console.error('Login error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat login';

    return corsResponse(
      NextResponse.json(
        {
          success: false,
          error: {
            message: errorMessage,
          },
        },
        { status: 500 }
      ),
      { origin: '*' }
    );
  }
}
