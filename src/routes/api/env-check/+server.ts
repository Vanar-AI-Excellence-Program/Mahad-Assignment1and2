import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const envCheck = {
      AUTH_SECRET: !!env.AUTH_SECRET,
      AUTH_URL: env.AUTH_URL,
      DATABASE_URL: !!env.DATABASE_URL,
      PUBLIC_APP_URL: env.PUBLIC_APP_URL,
      GMAIL_USER: !!env.GMAIL_USER,
      GMAIL_APP_PASSWORD: !!env.GMAIL_APP_PASSWORD,
    };

    console.log('🔧 Environment check:', envCheck);

    return json({
      success: true,
      environment: envCheck,
      message: 'Environment variables check completed'
    });
    
  } catch (error) {
    console.error('❌ Environment check error:', error);
    return json({ 
      success: false, 
      error: 'Environment check failed',
      details: error 
    }, { status: 500 });
  }
};
