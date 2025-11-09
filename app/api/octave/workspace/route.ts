import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { QuestionnaireData, OctaveWorkspaceRequest } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const OCTAVE_API_URL = 'https://app.octavehq.com/api/v2/agents/workspace/build';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const questionnaireData: QuestionnaireData = body.questionnaireData || body;
    const userEmail: string = body.email || 'noemail@example.com';
    const userId: string | undefined = body.userId;
    
    console.log('📥 Received submission from:', userEmail);
    console.log('📥 User ID from client:', userId || 'not provided');
    
    // Get API key from server environment (not exposed to client)
    const apiKey = process.env.OCTAVE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Octave API key not configured' },
        { status: 500 }
      );
    }

    console.log('Server API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

    // Use company name and domain from questionnaire data
    const companyName = questionnaireData.companyInfo?.companyName || 'Client Company';
    const companyDomain = questionnaireData.companyInfo?.companyDomain || 'client.com';
    const workspaceName = `${companyName} - Fractional Ops Workspace`;
    const workspaceUrl = `https://${companyDomain}`;
    
    console.log('Company Name:', companyName);
    console.log('Company Domain:', companyDomain);
    console.log('Workspace Name:', workspaceName);
    console.log('Workspace URL:', workspaceUrl);

    // Generate dynamic offering based on client's business
    const generateOffering = (data: QuestionnaireData) => {
      const companyName = data.companyInfo?.companyName || 'Client Company';
      
      // Use the new 10-step questionnaire structure
      const industry = data.whatYouDo?.industry || 'B2B services';
      const keyResponsibilities = data.yourBuyers?.decisionMakerResponsibilities || 'business operations';
      
      // Question 6: What makes your company unique or different from competitors?
      const differentiatedValue = data.howYouDoIt?.uniqueValue || 'unique value proposition';
      
      // Question 11: Why should they move away from the status quo? (with full context)
      const statusQuoQuestion = "Why should they move away from the status quo? Sometimes, your biggest competitor is inaction. The prospect understands your benefits at a high level, but it can't answer the 'what's in it for them.' How would you paint a picture of the future in a way that makes it impossible for your prospect to avoid learning more? What's in it for them?";
      const statusQuoAnswer = data.creatingDesire?.whyMoveAway || 'operational challenges';
      const statusQuo = `${statusQuoQuestion}\n\nAnswer: ${statusQuoAnswer}`;
      
      const serviceDescription = data.whatYouDeliver?.mainService || 'revenue growth services';
      
      return {
        type: "SERVICE",
        name: `${companyName} - ${serviceDescription}`,
        differentiatedValue: differentiatedValue,
        statusQuo: statusQuo
      };
    };

    const workspaceRequest: OctaveWorkspaceRequest = {
      workspace: {
        name: workspaceName,
        url: workspaceUrl,
        addExistingUsers: true,
        agentOIds: []
      },
      offering: generateOffering(questionnaireData),
      runtimeContext: JSON.stringify(questionnaireData),
      brandVoiceOId: "bv_fractional_ops",
      createDefaultAgents: true
    };

    console.log('=== OCTAVE API CALL DETAILS ===');
    console.log('API URL:', OCTAVE_API_URL);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT FOUND');
    console.log('Request Headers:', {
      'Content-Type': 'application/json',
      'api_key': apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT FOUND'
    });
    console.log('Full Workspace Request:', JSON.stringify(workspaceRequest, null, 2));
    console.log('Generated Offering:', JSON.stringify(workspaceRequest.offering, null, 2));
    console.log('Runtime Context (Questionnaire Data):', JSON.stringify(questionnaireData, null, 2));
    console.log('Making request to Octave API...');
    
    const response = await axios.post(OCTAVE_API_URL, workspaceRequest, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey
      }
    });

    console.log('=== OCTAVE API RESPONSE ===');
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    // Extract workspace and product information from response
    const workspaceOId = response.data?.workspace?.oId || response.data?.oId;
    const productOId = response.data?.offering?.oId || response.data?.product?.oId;
    console.log('🆔 Workspace OId:', workspaceOId);
    console.log('🆔 Product OId:', productOId);

    // Step 2: Create Client References in Octave (if we have client references)
    const clientReferences = questionnaireData.socialProof?.clientReferences || [];
    if (Array.isArray(clientReferences) && clientReferences.length > 0) {
      console.log('📝 Creating client references in Octave...');
      try {
        const referenceResponse = await fetch(`${request.nextUrl.origin}/api/octave/reference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientReferences,
            productOId: productOId,
            brandVoiceOId: 'bv_fractional_ops'
          }),
        });

        const referenceResult = await referenceResponse.json();
        
        if (referenceResponse.ok && referenceResult.success) {
          console.log(`✅ Created ${referenceResult.created}/${referenceResult.total} client references`);
          if (referenceResult.errors) {
            console.warn('⚠️ Some references failed:', referenceResult.errors);
          }
        } else {
          console.error('⚠️ Client reference creation failed (non-critical):', referenceResult);
        }
      } catch (referenceError) {
        console.error('⚠️ Client reference creation error (non-critical):', referenceError);
      }

      // Step 3: Create Segments in Octave based on industries from client references
      console.log('📊 Creating segments in Octave from industries...');
      try {
        const segmentResponse = await fetch(`${request.nextUrl.origin}/api/octave/segment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientReferences,
            primaryOfferingOId: productOId
          }),
        });

        const segmentResult = await segmentResponse.json();
        
        if (segmentResponse.ok && segmentResult.success) {
          console.log(`✅ Created ${segmentResult.created}/${segmentResult.total} segments`);
          if (segmentResult.errors) {
            console.warn('⚠️ Some segments failed:', segmentResult.errors);
          }
        } else {
          console.error('⚠️ Segment creation failed (non-critical):', segmentResult);
        }
      } catch (segmentError) {
        console.error('⚠️ Segment creation error (non-critical):', segmentError);
      }
    } else {
      console.log('ℹ️ No client references provided, skipping reference and segment creation');
    }

    // After successfully sending to Octave and creating references/segments, send to Zapier
    console.log('📤 Now sending PDF to Zapier...');
    try {
      // Use userId from client, or try to get from cookies as fallback
      let effectiveUserId = userId;
      
      if (!effectiveUserId) {
        console.log('⚠️ No userId from client, attempting to get from cookies...');
        const cookieStore = await cookies();
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                cookie: cookieStore.toString()
              }
            }
          }
        );
        
        const { data: { user } } = await supabase.auth.getUser();
        effectiveUserId = user?.id;
        console.log('👤 User ID from cookies:', effectiveUserId || 'null');
      } else {
        console.log('✅ Using userId from client:', effectiveUserId);
      }
      
      const zapierResponse = await fetch(`${request.nextUrl.origin}/api/send-to-zapier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          questionnaireData,
          userId: effectiveUserId // Pass user ID from client or cookies
        }),
      });

      const zapierResult = await zapierResponse.json();
      
      if (zapierResponse.ok) {
        console.log('✅ Successfully sent to Zapier:', zapierResult);
      } else {
        console.error('⚠️ Zapier webhook failed (non-critical):', zapierResult);
        // Don't fail the whole request if Zapier fails
      }
    } catch (zapierError) {
      console.error('⚠️ Zapier webhook error (non-critical):', zapierError);
      // Don't fail the whole request if Zapier fails
    }

    return NextResponse.json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.log('=== OCTAVE API ERROR ===');
    console.log('Error Message:', error.message);
    console.log('Error Response Status:', error.response?.status);
    console.log('Error Response Headers:', error.response?.headers);
    console.log('Error Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Full Error Object:', error);
    
    console.error('Error creating Octave workspace:', error.response?.data || error.message);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create Octave workspace',
        details: error.response?.data || error.message,
        statusCode: error.response?.status,
        apiUrl: OCTAVE_API_URL,
        hasApiKey: !!process.env.OCTAVE_API_KEY
      },
      { status: 500 }
    );
  }
}
