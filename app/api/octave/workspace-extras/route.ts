import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// PHASE 2: Create references, segments, and playbooks
// This route is called AFTER workspace creation completes
// Keeps each phase under 5 minutes to avoid Vercel timeout

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      workspaceOId,
      workspaceApiKey,
      productOId,
      personas,
      useCases,
      clientReferences
    } = body;

    console.log('🎨 ===== PHASE 2: WORKSPACE EXTRAS =====');
    console.log('👤 User ID:', userId);
    console.log('🆔 Workspace OId:', workspaceOId);
    console.log('🆔 Product OId:', productOId);
    console.log('👥 Personas:', personas?.length || 0);
    console.log('🎯 Use Cases:', useCases?.length || 0);
    console.log('📄 Client References:', clientReferences?.length || 0);

    if (!userId || !workspaceOId || !workspaceApiKey || !productOId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters for Phase 2' 
        },
        { status: 400 }
      );
    }

    let createdReferences: any[] = [];
    let createdSegments: any[] = [];
    let playbooksCreated = 0;

    // ============================================
    // STEP 1: CREATE CLIENT REFERENCES
    // ============================================
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
            workspaceOId: workspaceOId,
            workspaceApiKey: workspaceApiKey
          }),
        });

        const referenceResult = await referenceResponse.json();
        
        if (referenceResponse.ok && referenceResult.success) {
          console.log(`✅ Created ${referenceResult.created}/${referenceResult.total} client references`);
          createdReferences = referenceResult.references || [];
          if (referenceResult.errors) {
            console.warn('⚠️ Some references failed:', referenceResult.errors);
          }
        } else {
          console.error('⚠️ Client reference creation failed (non-critical):', referenceResult);
        }
      } catch (referenceError) {
        console.error('⚠️ Client reference creation error (non-critical):', referenceError);
      }

      // ============================================
      // STEP 2: CREATE SEGMENTS
      // ============================================
      console.log('📊 Creating segments in Octave from industries...');
      try {
        const segmentResponse = await fetch(`${request.nextUrl.origin}/api/octave/segment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientReferences,
            primaryOfferingOId: productOId,
            workspaceOId: workspaceOId,
            workspaceApiKey: workspaceApiKey
          }),
        });

        const segmentResult = await segmentResponse.json();
        
        if (segmentResponse.ok && segmentResult.success) {
          console.log(`✅ Created ${segmentResult.created}/${segmentResult.total} segments`);
          createdSegments = segmentResult.segments || [];
          if (segmentResult.errors) {
            console.warn('⚠️ Some segments failed:', segmentResult.errors);
          }
        } else {
          console.error('⚠️ Segment creation failed (non-critical):', segmentResult);
        }
      } catch (segmentError) {
        console.error('⚠️ Segment creation error (non-critical):', segmentError);
      }

      // ============================================
      // STEP 3: CREATE PLAYBOOKS
      // ============================================
      if (createdSegments.length > 0 && personas.length > 0 && useCases.length > 0) {
        console.log('📚 Creating playbooks in Octave...');
        try {
          const playbookResponse = await fetch(`${request.nextUrl.origin}/api/octave/playbook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              segments: createdSegments,
              references: createdReferences,
              personas: personas,
              useCases: useCases,
              productOId: productOId,
              workspaceApiKey: workspaceApiKey
            }),
          });

          const playbookResult = await playbookResponse.json();
          
          if (playbookResponse.ok && playbookResult.success) {
            playbooksCreated = playbookResult.created || 0;
            console.log(`✅ Created ${playbooksCreated}/${playbookResult.total} playbooks`);
            if (playbookResult.errors) {
              console.warn('⚠️ Some playbooks failed:', playbookResult.errors);
            }
          } else {
            console.error('⚠️ Playbook creation failed (non-critical):', playbookResult);
          }
        } catch (playbookError) {
          console.error('⚠️ Playbook creation error (non-critical):', playbookError);
        }
      } else {
        console.log('ℹ️ Skipping playbook creation - missing required data');
        console.log(`  Segments: ${createdSegments.length}, Personas: ${personas.length}, Use Cases: ${useCases.length}`);
      }
    } else {
      console.log('ℹ️ No client references provided, skipping reference, segment, and playbook creation');
    }

    // ============================================
    // STEP 4: UPDATE SUPABASE WITH EXTRAS
    // ============================================
    console.log('💾 Updating Supabase with Phase 2 data...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing record to merge with
    const { data: existingData } = await supabaseAdmin
      .from('octave_outputs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingData) {
      console.error('⚠️ No existing workspace data found for user:', userId);
      return NextResponse.json({
        success: true,
        message: 'Phase 2 completed but could not update database',
        referencesCreated: createdReferences.length,
        segmentsCreated: createdSegments.length,
        playbooksCreated: playbooksCreated
      });
    }

    // Update with Phase 2 data
    const { error: updateError } = await supabaseAdmin
      .from('octave_outputs')
      .update({
        segments: createdSegments,
        client_references: createdReferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error updating Supabase with Phase 2 data:', updateError);
    } else {
      console.log('✅ Supabase updated with Phase 2 data successfully');
    }

    console.log('🎉 ===== PHASE 2 COMPLETE =====');
    console.log(`   References: ${createdReferences.length}`);
    console.log(`   Segments: ${createdSegments.length}`);
    console.log(`   Playbooks: ${playbooksCreated}`);

    return NextResponse.json({
      success: true,
      message: 'Phase 2 completed successfully',
      referencesCreated: createdReferences.length,
      segmentsCreated: createdSegments.length,
      playbooksCreated: playbooksCreated
    });

  } catch (error) {
    console.error('❌ Phase 2 error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error in Phase 2',
        phase: 2
      },
      { status: 500 }
    );
  }
}

