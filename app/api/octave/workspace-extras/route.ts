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
      clientReferences,
      competitors
    } = body;

    console.log('🎨 ===== PHASE 2: WORKSPACE EXTRAS =====');
    console.log('👤 User ID:', userId);
    console.log('🆔 Workspace OId:', workspaceOId);
    console.log('🆔 Product OId:', productOId);
    console.log('👥 Personas received:', personas?.length || 0);
    console.log('🎯 Use Cases received:', useCases?.length || 0);
    console.log('📄 Client References received:', clientReferences?.length || 0);
    console.log('⚔️ Competitors received:', competitors?.length || 0);
    
    if (Array.isArray(clientReferences) && clientReferences.length > 0) {
      console.log('   → First reference:', clientReferences[0]?.companyName || 'N/A');
    }
    if (Array.isArray(competitors) && competitors.length > 0) {
      console.log('   → First competitor:', competitors[0]?.companyName || 'N/A');
    }

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
    let createdCompetitors: any[] = [];
    let createdPlaybooks: any[] = [];
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
    } else {
      console.log('ℹ️ No client references provided, skipping reference creation');
    }

    // ============================================
    // STEP 2: CREATE SEGMENTS
    // ============================================
    // Segments should ALWAYS be attempted if we have references
    // Don't gate this on clientReferences.length check
    if (Array.isArray(clientReferences) && clientReferences.length > 0) {
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
    } else {
      console.log('⚠️ No client references provided - segments require references, skipping');
    }

    // ============================================
    // STEP 3: CREATE COMPETITORS
    // ============================================
    if (Array.isArray(competitors) && competitors.length > 0) {
        console.log('⚔️ Creating competitors in Octave...');
        try {
          const competitorResponse = await fetch(`${request.nextUrl.origin}/api/octave/competitor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              competitors: competitors,
              productOId: productOId,
              workspaceOId: workspaceOId,
              workspaceApiKey: workspaceApiKey
            }),
          });

          const competitorResult = await competitorResponse.json();
          
          if (competitorResponse.ok && competitorResult.success) {
            console.log(`✅ Created ${competitorResult.created}/${competitorResult.total} competitors`);
            createdCompetitors = competitorResult.competitors || [];
            if (competitorResult.errors) {
              console.warn('⚠️ Some competitors failed:', competitorResult.errors);
            }
          } else {
            console.error('⚠️ Competitor creation failed (non-critical):', competitorResult);
          }
        } catch (competitorError) {
          console.error('⚠️ Competitor creation error (non-critical):', competitorError);
        }
    } else {
      console.log('ℹ️ No competitors provided, skipping competitor creation');
    }

    // ============================================
    // STEP 4: CREATE PLAYBOOKS
    // ============================================
    // Playbooks require segments, personas, and use cases
    if (createdSegments.length > 0 && personas && personas.length > 0 && useCases && useCases.length > 0) {
        console.log('📚 Creating playbooks in Octave...');
        console.log(`  → ${createdSegments.length} segments × ${personas.length} personas × ${useCases.length} use cases`);
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
            createdPlaybooks = playbookResult.playbooks || [];
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
      console.warn('⚠️ Skipping playbook creation - missing required data');
      console.log(`  → Segments: ${createdSegments.length}, Personas: ${personas?.length || 0}, Use Cases: ${useCases?.length || 0}`);
    }

    // ============================================
    // STEP 5: GENERATE CAMPAIGN IDEAS FROM PLAYBOOKS
    // ============================================
    const campaignIdeas = createdPlaybooks.map((playbook: any) => ({
      title: playbook.playbookName || `${playbook.segmentName} Campaign`,
      description: `Targeted outreach campaign for ${playbook.segmentName} companies`
    }));

    if (campaignIdeas.length > 0) {
      console.log(`💡 Generated ${campaignIdeas.length} campaign ideas from playbooks`);
    }

    // ============================================
    // STEP 6: UPDATE SUPABASE WITH EXTRAS
    // ============================================
    console.log('💾 Updating Supabase with Phase 2 data...');
    console.log(`  → References to save: ${createdReferences.length}`);
    console.log(`  → Segments to save: ${createdSegments.length}`);
    console.log(`  → Competitors to save: ${createdCompetitors.length}`);
    console.log(`  → Campaign ideas to save: ${campaignIdeas.length}`);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the MOST RECENT record for this user (handles multiple records)
    const { data: existingData, error: fetchError } = await supabaseAdmin
      .from('octave_outputs')
      .select('id, workspace_oid, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !existingData) {
      console.error('❌ Error fetching workspace data:', fetchError);
      console.error('   User ID:', userId);
      console.error('   This is CRITICAL - Phase 2 data will NOT be saved!');
      console.error('   Attempting to save anyway using user_id match...');
    }

    const recordId = existingData?.id;
    const workspaceOidFromDb = existingData?.workspace_oid;
    
    console.log(`📍 Target record ID: ${recordId || 'UNKNOWN - will use user_id'}`);
    console.log(`📍 Target workspace OID: ${workspaceOidFromDb || workspaceOId}`);

    // Update with Phase 2 data - use record ID if available, otherwise user_id
    const updateQuery = supabaseAdmin
      .from('octave_outputs')
      .update({
        segments: createdSegments,
        client_references: createdReferences,
        competitors: createdCompetitors,
        campaign_ideas: campaignIdeas,
        updated_at: new Date().toISOString()
      });

    // Target specific record by ID if we have it, otherwise by user_id (less reliable)
    const { error: updateError, data: updatedData } = recordId 
      ? await updateQuery.eq('id', recordId).select()
      : await updateQuery.eq('user_id', userId).order('created_at', { ascending: false }).limit(1).select();

    if (updateError) {
      console.error('❌ CRITICAL ERROR updating Supabase with Phase 2 data:', updateError);
      console.error('   Update target:', recordId ? `Record ID: ${recordId}` : `User ID: ${userId}`);
      console.error('   Data that FAILED to save:');
      console.error(`     - ${createdReferences.length} references`);
      console.error(`     - ${createdSegments.length} segments`);
      console.error(`     - ${createdCompetitors.length} competitors`);
      console.error(`     - ${campaignIdeas.length} campaign ideas`);
      
      // Return error but with data so we know what was lost
      return NextResponse.json({
        success: false,
        error: 'Failed to save Phase 2 data to database',
        phase: 2,
        updateError: updateError,
        dataLost: {
          references: createdReferences.length,
          segments: createdSegments.length,
          competitors: createdCompetitors.length,
          campaignIdeas: campaignIdeas.length
        }
      }, { status: 500 });
    } else {
      console.log('✅ Supabase UPDATE successful!');
      console.log(`   Updated ${updatedData?.length || 0} record(s)`);
      
      // Verify what was actually saved using the returned data
      if (updatedData && updatedData.length > 0) {
        const saved = updatedData[0];
        console.log('🔍 VERIFICATION - What was actually saved to Supabase:');
        console.log(`  → Segments in DB: ${Array.isArray(saved?.segments) ? saved.segments.length : 'NOT ARRAY'}`);
        console.log(`  → References in DB: ${Array.isArray(saved?.client_references) ? saved.client_references.length : 'NOT ARRAY'}`);
        console.log(`  → Competitors in DB: ${Array.isArray(saved?.competitors) ? saved.competitors.length : 'NOT ARRAY'}`);
        console.log(`  → Campaign Ideas in DB: ${Array.isArray(saved?.campaign_ideas) ? saved.campaign_ideas.length : 'NOT ARRAY'}`);
        
        // Double-check arrays aren't empty when they should have data
        if (createdReferences.length > 0 && (!saved?.client_references || saved.client_references.length === 0)) {
          console.error('⚠️⚠️⚠️ REFERENCES WERE NOT SAVED DESPITE UPDATE SUCCESS!');
        }
        if (createdSegments.length > 0 && (!saved?.segments || saved.segments.length === 0)) {
          console.error('⚠️⚠️⚠️ SEGMENTS WERE NOT SAVED DESPITE UPDATE SUCCESS!');
        }
        if (createdCompetitors.length > 0 && (!saved?.competitors || saved.competitors.length === 0)) {
          console.error('⚠️⚠️⚠️ COMPETITORS WERE NOT SAVED DESPITE UPDATE SUCCESS!');
        }
        if (campaignIdeas.length > 0 && (!saved?.campaign_ideas || saved.campaign_ideas.length === 0)) {
          console.error('⚠️⚠️⚠️ CAMPAIGN IDEAS WERE NOT SAVED DESPITE UPDATE SUCCESS!');
        }
      } else {
        console.warn('⚠️ No data returned from update - cannot verify save');
      }
    }

    console.log('🎉 ===== PHASE 2 COMPLETE =====');
    console.log(`   References: ${createdReferences.length}`);
    console.log(`   Segments: ${createdSegments.length}`);
    console.log(`   Competitors: ${createdCompetitors.length}`);
    console.log(`   Playbooks: ${playbooksCreated}`);

    return NextResponse.json({
      success: true,
      message: 'Phase 2 completed successfully',
      referencesCreated: createdReferences.length,
      segmentsCreated: createdSegments.length,
      competitorsCreated: createdCompetitors.length,
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

