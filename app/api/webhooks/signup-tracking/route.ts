import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId, timestamp } = body;
    
    // Get Zapier webhook URL from environment
    const zapierSignupWebhookUrl = process.env.ZAPIER_SIGNUP_WEBHOOK_URL;
    
    if (!zapierSignupWebhookUrl) {
      console.error('❌ Zapier signup webhook URL not configured');
      return NextResponse.json(
        { error: 'Zapier signup webhook URL not configured' },
        { status: 500 }
      );
    }
    
    console.log('🎉 New verified user signup:', email);
    
    // Create payload for Zapier
    const payload = {
      email,
      userId,
      signupTimestamp: timestamp || new Date().toISOString(),
      source: 'Fractional Ops Onboarding App',
      status: 'verified',
      appVersion: '1.0',
      signupMethod: 'email_password'
    };
    
    console.log('📤 Sending signup event to Zapier webhook');
    
    // Send to Zapier
    const response = await fetch(zapierSignupWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📤 Zapier signup webhook response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Zapier signup webhook error:', errorText);
      throw new Error(`Zapier webhook failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Successfully sent signup to Zapier:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Signup tracked successfully',
      zapierResponse: result
    });
    
  } catch (error: any) {
    console.error('❌ Error in signup tracking:', error);
    
    // Don't fail the signup if tracking fails (non-critical)
    return NextResponse.json(
      { 
        error: 'Failed to track signup',
        details: error.message
      },
      { status: 500 }
    );
  }
}

