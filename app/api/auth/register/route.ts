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
    const { email, password, name, ownerCode } = body;

    // Validation
    if (!email || !password || !name) {
      return corsResponse(
        NextResponse.json(
          {
            success: false,
            error: {
              message: 'Email, password, dan nama harus diisi',
            },
          },
          { status: 400 }
        ),
        { origin: '*' }
      );
    }

    if (password.length < 8) {
      return corsResponse(
        NextResponse.json(
          {
            success: false,
            error: {
              message: 'Password minimal 8 karakter',
            },
          },
          { status: 400 }
        ),
        { origin: '*' }
      );
    }

    // TODO: Implement actual registration logic
    // - Hash password
    // - Check if email exists
    // - Create user in database
    // - Send verification email

    return corsResponse(
      NextResponse.json(
        {
          success: true,
          data: {
            message: 'Registrasi berhasil. Silakan cek email Anda.',
            user: {
              email,
              name,
              ...(ownerCode && { ownerCode }),
            },
          },
        },
        { status: 201 }
      ),
      { origin: '*' }
    );
  } catch (error) {
    console.error('Register error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat registrasi';

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
