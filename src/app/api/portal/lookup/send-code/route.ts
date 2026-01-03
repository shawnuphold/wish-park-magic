import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setVerificationCode, generateCode } from '@/lib/verificationStore';
import { sendEmail } from '@/lib/email/mailer';
import {
  generateVerificationEmailHtml,
  generateVerificationEmailText,
} from '@/lib/email/templates/verificationCode';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, request_id } = await request.json();

    if (!email || !request_id) {
      return NextResponse.json(
        { success: false, error: 'Email and request ID are required' },
        { status: 400 }
      );
    }

    // Find the request
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select('id, email')
      .eq('id', request_id)
      .eq('email', email.toLowerCase())
      .single();

    if (requestError || !requestData) {
      return NextResponse.json(
        { success: false, error: 'Request not found. Please check your email and request ID.' },
        { status: 404 }
      );
    }

    // Generate verification code
    const code = generateCode();
    setVerificationCode(email, request_id, code);

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: `Your verification code: ${code}`,
        html: generateVerificationEmailHtml({ code, requestId: request_id }),
        text: generateVerificationEmailText({ code, requestId: request_id }),
      });
      console.log(`Verification code sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the request - the code is still valid
      // User can check console in dev mode
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      // In development, return the code for testing
      ...(process.env.NODE_ENV === 'development' && { code }),
    });
  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
