interface EmailFinderParams {
  first_name: string;
  last_name: string | null;
  domain?: string;
  company_name?: string;
}

interface EmailFinderResponse {
  email: string;
  status: 'valid' | 'valid_catch_all' | 'catch_all' | 'not_found';
  credits_consumed: number;
  message: string;
  first_name: string;
  last_name: string;
  domain: string;
  is_domain_catch_all: boolean;
  mx_record: string;
  mx_provider: string;
  mx_security_gateway: boolean;
  company_name: string;
  company_industry: string;
  company_size: string;
  company_founded: number;
  company_location: any;
  company_linkedin_url: string;
  company_linkedin_id: string;
  company_facebook_url: string;
  company_twitter_url: string;
  company_type: string;
}

interface MobileFinderParams {
  profile_url?: string;
  work_email?: string;
  personal_email?: string;
}

interface MobileFinderResponse {
  profile_url: string;
  mobile_number: number;
  credits_consumed: number;
}

const LEADMAGIC_API_KEY = process.env.LEADMAGIC_API_KEY;
const LEADMAGIC_BASE_URL = 'https://api.leadmagic.io/v1';

// Rate limiting: 400 req/min for email, 300 req/min for mobile
// We'll use 300/min to be safe (one every 200ms)
const RATE_LIMIT_DELAY_MS = 200;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Timeout wrapper for fetch calls to prevent hanging
async function fetchWithTimeout(url: string, options: any, timeoutMs: number = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export async function findEmail(params: EmailFinderParams): Promise<EmailFinderResponse | null> {
  if (!LEADMAGIC_API_KEY) {
    console.error('❌ LeadMagic API key not configured');
    return null;
  }

  try {
    console.log(`📧 Finding email for: ${params.first_name} ${params.last_name} at ${params.company_name || params.domain}`);
    
    const response = await fetchWithTimeout(
      `${LEADMAGIC_BASE_URL}/people/email-finder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LEADMAGIC_API_KEY
        },
        body: JSON.stringify(params)
      },
      30000 // 30 second timeout
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ LeadMagic Email Finder error:', error);
      return null;
    }

    const data: EmailFinderResponse = await response.json();
    console.log(`✅ Email found: ${data.email} (status: ${data.status})`);
    
    // Add rate limit delay
    await delay(RATE_LIMIT_DELAY_MS);
    
    return data;
  } catch (error) {
    console.error('❌ Error calling LeadMagic Email Finder:', error);
    return null;
  }
}

export async function findMobile(params: MobileFinderParams): Promise<MobileFinderResponse | null> {
  if (!LEADMAGIC_API_KEY) {
    console.error('❌ LeadMagic API key not configured');
    return null;
  }

  try {
    console.log(`📱 Finding mobile for: ${params.work_email || params.profile_url}`);
    
    const response = await fetchWithTimeout(
      `${LEADMAGIC_BASE_URL}/people/mobile-finder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LEADMAGIC_API_KEY
        },
        body: JSON.stringify(params)
      },
      30000 // 30 second timeout
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ LeadMagic Mobile Finder error:', error);
      return null;
    }

    const data: MobileFinderResponse = await response.json();
    
    // Debug: Log full response to verify field mappings
    console.log('🔍 LeadMagic Mobile Response:', JSON.stringify(data, null, 2));
    
    // Enhanced logging for mobile results
    if (data.mobile_number) {
      console.log(`✅ Mobile found: +${data.mobile_number}`);
    } else {
      console.log(`⚠️ Mobile not found in LeadMagic database (email: ${params.work_email?.substring(0, 20)}...)`);
      console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
    }
    
    // Add rate limit delay
    await delay(RATE_LIMIT_DELAY_MS);
    
    return data;
  } catch (error) {
    console.error('❌ Error calling LeadMagic Mobile Finder:', error);
    return null;
  }
}

export async function enrichProspect(prospect: any): Promise<any> {
  console.log(`🔍 Enriching prospect: ${prospect.name} at ${prospect.company}`);
  
  // Extract first and last name
  const nameParts = prospect.name?.split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || null;
  
  // Try to extract domain from company website or LinkedIn
  let domain = '';
  if (prospect.company_website) {
    domain = prospect.company_website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  } else if (prospect.company_linkedin) {
    // Fallback: use company name as domain search
    domain = '';
  }
  
  // Step 1: Find email
  const emailData = await findEmail({
    first_name: firstName,
    last_name: lastName,
    domain: domain || undefined,
    company_name: prospect.company
  });

  // Step 2: Find mobile (if we found a valid email)
  let mobileData = null;
  if (emailData?.email && (emailData.status === 'valid' || emailData.status === 'valid_catch_all')) {
    mobileData = await findMobile({
      work_email: emailData.email,
      profile_url: prospect.linkedIn || undefined
    });
  }

  // Return enriched prospect
  return {
    ...prospect,
    email: emailData?.email || null,
    email_status: emailData?.status || null,
    mobile_number: mobileData?.mobile_number || null,
    enrichment_data: {
      mx_provider: emailData?.mx_provider || null,
      mx_security_gateway: emailData?.mx_security_gateway || null,
      company_size: emailData?.company_size || null,
      company_industry: emailData?.company_industry || null,
      company_location: emailData?.company_location || null,
      company_linkedin_url: emailData?.company_linkedin_url || null
    }
  };
}

