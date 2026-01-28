'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { ChevronLeft, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { renderHighlightedContent, hasHighlights } from '@/lib/render-highlights';
import PlayGenerationLoader from '@/components/PlayGenerationLoader';

// Force dynamic rendering - prevents caching issues with edits
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Play {
  code: string;
  name: string;
  category: string;
}

interface WorkspaceData {
  personas: Array<{ oId: string; name: string }>;
  useCases: Array<{ oId: string; name: string }>;
  clientReferences: Array<{ oId: string; name: string }>;
}

interface Execution {
  id: string;
  output: any;
  status: string;
}

function PlayExecutionPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const category = params.category as string;
  const code = params.code as string;
  // This route doesn't have executionId in params - it's for new executions only

  const [play, setPlay] = useState<Play | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [highlightsEnabled, setHighlightsEnabled] = useState(true); // Default ON
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Loading modal state
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('Initializing...');

  // Form state
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [editedOutput, setEditedOutput] = useState('');

  const loadPlayAndWorkspaceData = useCallback(async () => {
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Load play details
      const playResponse = await fetch(`/api/client/plays?category=${category}`, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      const playData = await playResponse.json();
      const foundPlay = playData.plays?.find((p: Play) => p.code === code);
      setPlay(foundPlay || null);

      // Load workspace data
      const workspaceUrl = addImpersonateParam('/api/client/workspace-data', impersonateUserId);
      const workspaceResponse = await fetch(workspaceUrl, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      const workspaceResult = await workspaceResponse.json();
      
      if (workspaceResult.success) {
        setWorkspaceData({
          personas: workspaceResult.personas || [],
          useCases: workspaceResult.useCases || [],
          clientReferences: workspaceResult.clientReferences || []
        });
      } else {
        toast.error(workspaceResult.error || 'Failed to load workspace data');
      }

      // This route is for new executions only - existing executions use [executionId] route

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load play data');
      setLoading(false);
    }
  }, [code, category, impersonateUserId]);

  useEffect(() => {
    loadPlayAndWorkspaceData();
  }, [loadPlayAndWorkspaceData]);

  // Auto-save with debounce when editedOutput changes
  useEffect(() => {
    // Only auto-save if we have an execution and user is editing
    if (!execution || !editing || execution.status === 'approved') {
      return;
    }

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after user stops typing)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        const saveUrl = addImpersonateParam(`/api/client/executions/${execution.id}`, impersonateUserId);
        const response = await fetch(saveUrl, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` })
          },
          credentials: 'include',
          body: JSON.stringify({
            output: {
              content: editedOutput,
              jsonContent: execution.output?.jsonContent || {}
            },
            status: 'in_progress'
          })
        });

        const result = await response.json();

        if (result.success) {
          setExecution({
            ...execution,
            status: 'in_progress'
          });
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setAutoSaving(false);
      }
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editedOutput, editing, execution, impersonateUserId]);

  // Poll for highlighting completion
  const pollHighlightingStatus = async (executionId: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      const maxAttempts = 60; // 2 minutes max (60 * 2 seconds)
      let attempts = 0;
      
      const poll = async () => {
        attempts++;
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;
          
          const checkUrl = addImpersonateParam(`/api/client/executions/${executionId}`, impersonateUserId);
          const response = await fetch(checkUrl, {
            credentials: 'include',
            headers: {
              ...(authToken && { Authorization: `Bearer ${authToken}` })
            }
          });
          
          const result = await response.json();
          
          if (result.success && result.execution) {
            const highlightingStatus = result.execution.output?.highlighting_status;
            
            // Update progress based on status
            if (highlightingStatus === 'in_progress') {
              // Gradually increase progress from 50% to 90% while highlighting
              const progressIncrement = Math.min(90, 50 + (attempts * 2));
              setGenerationProgress(progressIncrement);
              setGenerationStep('Applying semantic highlights...');
            }
            
            // Check if highlighting is complete
            if (highlightingStatus === 'completed' || highlightingStatus === 'completed_no_highlights') {
              setGenerationProgress(100);
              setGenerationStep('Complete!');
              resolve(result.execution);
              return;
            }
            
            if (highlightingStatus === 'failed') {
              console.warn('Highlighting failed, but continuing with plain output');
              setGenerationProgress(100);
              setGenerationStep('Complete!');
              resolve(result.execution);
              return;
            }
            
            // Continue polling if not complete
            if (attempts < maxAttempts) {
              setTimeout(poll, 2000); // Poll every 2 seconds
            } else {
              console.warn('Highlighting timed out, showing output without highlights');
              resolve(result.execution);
            }
          } else {
            reject(new Error('Failed to fetch execution status'));
          }
        } catch (error) {
          console.error('Error polling highlighting status:', error);
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
            reject(error);
          }
        }
      };
      
      poll();
    });
  };

  const handleExecute = async () => {
    if (!selectedPersona || selectedUseCases.length === 0) {
      toast.error('Please select a persona and at least one use case');
      return;
    }

    // Show loading modal
    setShowLoadingModal(true);
    setGenerationProgress(0);
    setGenerationStep('Initializing...');
    setExecuting(true);

    try {
      // Progress: 10%
      setGenerationProgress(10);
      setGenerationStep('Preparing your play...');

      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const runtimeContext = {
        personas: workspaceData?.personas.filter(p => p.oId === selectedPersona) || [],
        useCases: workspaceData?.useCases.filter(uc => selectedUseCases.includes(uc.oId)) || [],
        clientReferences: workspaceData?.clientReferences.filter(r => selectedReferences.includes(r.oId)) || []
      };

      // Progress: 25%
      setGenerationProgress(25);
      setGenerationStep('Running your play agent...');

      const executeUrl = addImpersonateParam('/api/client/execute-play', impersonateUserId);
      const response = await fetch(executeUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          playCode: code,
          runtimeContext
        })
      });

      const result = await response.json();

      if (result.success) {
        // Progress: 50%
        setGenerationProgress(50);
        setGenerationStep('Output generated! Now applying highlights...');

        // Wait for highlighting to complete
        const finalExecution = await pollHighlightingStatus(result.execution.id);
        
        // Progress: 100%
        setGenerationProgress(100);
        setGenerationStep('Complete!');
        
        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Hide loading modal
        setShowLoadingModal(false);
        
        setExecution({
          id: finalExecution.id,
          output: finalExecution.output,
          status: 'draft'
        });
        setEditedOutput(finalExecution.output.content || JSON.stringify(finalExecution.output, null, 2));
        toast.success('Play executed successfully!');
        
        // Update URL to include execution ID and preserve impersonate parameter
        const newUrl = impersonateUserId 
          ? `/client/${category}/${code}/${result.execution.id}?impersonate=${impersonateUserId}`
          : `/client/${category}/${code}/${result.execution.id}`;
        router.replace(newUrl);
      } else {
        setShowLoadingModal(false);
        toast.error(result.error || 'Failed to execute play');
      }
    } catch (error) {
      console.error('Error executing play:', error);
      setShowLoadingModal(false);
      toast.error('Failed to execute play');
    } finally {
      setExecuting(false);
    }
  };

  const handleRefine = async () => {
    if (!customInput.trim()) {
      toast.error('Please provide refinement instructions');
      return;
    }

    if (!execution) {
      toast.error('No output to refine');
      return;
    }

    // Show loading modal
    setShowLoadingModal(true);
    setGenerationProgress(0);
    setGenerationStep('Initializing refinement...');
    setRefining(true);

    try {
      // Progress: 10%
      setGenerationProgress(10);
      setGenerationStep('Preparing refinement...');

      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Get the current output content
      const currentOutput = execution.output?.content || JSON.stringify(execution.output, null, 2);

      // Build refinement prompt with structured message
      const refinementPrompt = `Hi, we just ran this agent and got an output.

Our CEO Client has the following changes they'd like made:

${customInput.trim()}

Here's the output the CEO received:

${currentOutput}

Please output the exact same output but take the feedback the CEO provided in the new output.`;

      const runtimeContext = {
        personas: workspaceData?.personas.filter(p => p.oId === selectedPersona) || [],
        useCases: workspaceData?.useCases.filter(uc => selectedUseCases.includes(uc.oId)) || [],
        clientReferences: workspaceData?.clientReferences.filter(r => selectedReferences.includes(r.oId)) || [],
        customInput: refinementPrompt
      };

      // Progress: 25%
      setGenerationProgress(25);
      setGenerationStep('Running refinement agent...');

      const refineUrl = addImpersonateParam('/api/client/execute-play', impersonateUserId);
      const response = await fetch(refineUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          playCode: code,
          runtimeContext,
          refinementPrompt: refinementPrompt
        })
      });

      const result = await response.json();

      if (result.success) {
        // Progress: 50%
        setGenerationProgress(50);
        setGenerationStep('Refinement complete! Now applying highlights...');

        // Wait for highlighting to complete
        const finalExecution = await pollHighlightingStatus(result.execution.id);
        
        // Progress: 100%
        setGenerationProgress(100);
        setGenerationStep('Complete!');
        
        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Hide loading modal
        setShowLoadingModal(false);

        setExecution({
          id: finalExecution.id,
          output: finalExecution.output,
          status: 'draft'
        });
        setEditedOutput(finalExecution.output.content || JSON.stringify(finalExecution.output, null, 2));
        toast.success('Output refined successfully!');
        
        // Update URL to include execution ID and preserve impersonate parameter
        const refinedUrl = impersonateUserId 
          ? `/client/${category}/${code}/${result.execution.id}?impersonate=${impersonateUserId}`
          : `/client/${category}/${code}/${result.execution.id}`;
        router.replace(refinedUrl);
      } else {
        setShowLoadingModal(false);
        toast.error(result.error || 'Failed to refine output');
      }
    } catch (error) {
      console.error('Error refining:', error);
      setShowLoadingModal(false);
      toast.error('Failed to refine output');
    } finally {
      setRefining(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!execution) {
      toast.error('No execution to save');
      return;
    }

    setSaving(true);
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Update execution output and change status to 'in_progress'
      const saveUrl = addImpersonateParam(`/api/client/executions/${execution.id}`, impersonateUserId);
      const response = await fetch(saveUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          output: {
            content: editedOutput,
            jsonContent: execution.output?.jsonContent || {}
          },
          status: 'in_progress' // Changed from 'draft' to 'in_progress'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update local execution state
        setExecution({
          ...execution,
          output: result.execution.output,
          status: result.execution.status
        });
        setEditing(false);
        toast.success('Saved! Play is now In Progress');
        
        // Update URL to include execution ID and preserve impersonate parameter
        if (result.execution.id) {
          const savedUrl = impersonateUserId 
            ? `/client/${category}/${code}/${result.execution.id}?impersonate=${impersonateUserId}`
            : `/client/${category}/${code}/${result.execution.id}`;
          router.replace(savedUrl);
        }
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Direct approve function (no approval page needed)
  const handleDirectApprove = async () => {
    if (!execution) {
      toast.error('No execution to approve');
      return;
    }

    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Save current edits first
      const saveUrl = addImpersonateParam(`/api/client/executions/${execution.id}`, impersonateUserId);
      await fetch(saveUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          output: {
            content: editedOutput,
            jsonContent: execution.output?.jsonContent || {}
          },
          status: 'approved' // Directly set to approved
        })
      });

      // Send approval notification via Zapier
      const approveUrl = addImpersonateParam('/api/client/approve-execution', impersonateUserId);
      const response = await fetch(approveUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          executionId: execution.id,
          playCode: code,
          playName: play?.name || code,
          editedOutput: editedOutput
        })
      });

      const result = await response.json();

      if (result.success) {
        setExecution({
          ...execution,
          status: 'approved'
        });
        toast.success('✅ Approved! Notification sent to GTM Engineer');
        
        // Redirect back to play list after 2 seconds
        setTimeout(() => {
          const listUrl = impersonateUserId 
            ? `/client/${category}?impersonate=${impersonateUserId}`
            : `/client/${category}`;
          router.push(listUrl);
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to approve');
      }
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    }
  };

  // Get the content to display (highlighted or plain)
  const getDisplayContent = () => {
    if (!execution?.output) return '';
    
    const rawContent = execution.output.content || JSON.stringify(execution.output, null, 2);
    const highlightedHtml = execution.output.highlighted_html;
    
    if (highlightsEnabled && highlightedHtml && hasHighlights(highlightedHtml)) {
      return renderHighlightedContent(highlightedHtml);
    }
    
    // Fallback to plain content
    return rawContent.replace(/\n/g, '<br/>').replace(/ /g, '&nbsp;');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading play...</p>
        </div>
      </div>
    );
  }

  if (!play) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <p className="text-fo-text-secondary text-lg mb-4">Play not found</p>
        <Link href={`/client/${category}`} className="text-fo-primary hover:underline">
          <ChevronLeft className="w-4 h-4 inline mr-1" strokeWidth={2} />
          Back to {category} plays
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/client/${category}`} className="text-fo-primary hover:underline mb-2 inline-block">
          <ChevronLeft className="w-4 h-4 inline mr-1" strokeWidth={2} />
          Back to {category} plays
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-fo-dark mb-2">{play.name}</h1>
            <p className="text-fo-text-secondary">Play Code: {play.code}</p>
          </div>
          <Link
            href={impersonateUserId 
              ? `/client/${category}/${code}/new-campaign?impersonate=${impersonateUserId}`
              : `/client/${category}/${code}/new-campaign`
            }
            className="px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark transition-colors text-sm font-semibold"
          >
            Create Full Campaign
          </Link>
        </div>
      </div>

      {!execution ? (
        // Runtime Context Collection Form
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold text-fo-dark mb-6">Configure Your Play</h2>
          
          <div className="space-y-6">
            {/* Persona Selection */}
            <div>
              <label className="block text-sm font-semibold text-fo-dark mb-2">
                Select Persona <span className="text-fo-orange">*</span>
              </label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
              >
                <option value="">Choose a persona...</option>
                {workspaceData?.personas.map((persona) => (
                  <option key={persona.oId} value={persona.oId}>
                    {persona.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Use Cases Selection */}
            <div>
              <label className="block text-sm font-semibold text-fo-dark mb-2">
                Select Use Cases <span className="text-fo-orange font-semibold">*</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-fo-light rounded-lg p-4">
                {workspaceData?.useCases.map((useCase) => (
                  <label key={useCase.oId} className="flex items-center gap-2 cursor-pointer hover:bg-fo-light p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedUseCases.includes(useCase.oId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUseCases([...selectedUseCases, useCase.oId]);
                        } else {
                          setSelectedUseCases(selectedUseCases.filter(id => id !== useCase.oId));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-fo-dark">{useCase.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Client References Selection */}
            <div>
              <label className="block text-sm font-semibold text-fo-dark mb-2">
                Select Client References <span className="text-fo-text-secondary font-normal">(Optional)</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-fo-light rounded-lg p-4">
                {workspaceData?.clientReferences.length === 0 ? (
                  <p className="text-sm text-fo-text-secondary">No client references available</p>
                ) : (
                  workspaceData?.clientReferences.map((reference) => (
                    <label key={reference.oId} className="flex items-center gap-2 cursor-pointer hover:bg-fo-light p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedReferences.includes(reference.oId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReferences([...selectedReferences, reference.oId]);
                          } else {
                            setSelectedReferences(selectedReferences.filter(id => id !== reference.oId));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-fo-dark">{reference.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={executing || !selectedPersona || selectedUseCases.length === 0}
              className="w-full px-6 py-3 bg-fo-primary text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {executing ? 'Executing Play...' : 'Run Play'}
            </button>
          </div>
        </div>
      ) : (
        // Output Display and Editing
        <div className="space-y-6">
          {/* Highlight Legend - Only show when highlights are enabled, at the top */}
          {highlightsEnabled && execution && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-fo-dark mb-4">Highlight Legend</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-fo-dark mb-2">Claire Elements</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-highlight-persona text-fo-dark px-2 py-1 rounded text-xs font-semibold">Persona</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-highlight-segment text-fo-dark px-2 py-1 rounded text-xs font-semibold">Segment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-highlight-outcome text-fo-dark px-2 py-1 rounded text-xs font-semibold">Use Case (Desired Outcome)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-highlight-blocker text-fo-dark px-2 py-1 rounded text-xs font-semibold">Use Case (Problem/Blocker)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-highlight-cta text-fo-dark px-2 py-1 rounded text-xs font-semibold">CTA (Lead Magnet)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-highlight-resource text-fo-dark px-2 py-1 rounded text-xs font-semibold">Resource/Valuable Offer</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-fo-dark mb-2">Claire Content Agent Personalization</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-highlight-personalized text-fo-dark px-2 py-1 rounded text-xs font-semibold">Personalized/ Claire Generated Info</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Output Display */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-fo-dark">Generated Output</h2>
              <div className="flex gap-2">
                {!editing && (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-fo-light text-fo-dark rounded-lg hover:bg-fo-primary hover:text-white transition-all"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-4">
                {/* Auto-save indicator */}
                <div className="flex items-center justify-between text-xs text-fo-text-secondary">
                  <div>
                    {autoSaving && (
                      <span className="text-blue-600">💾 Auto-saving...</span>
                    )}
                    {!autoSaving && lastSaved && (
                      <span className="text-green-600">✅ Saved {lastSaved.toLocaleTimeString()}</span>
                    )}
                    {!autoSaving && !lastSaved && (
                      <span>Auto-save enabled (saves 2 seconds after you stop typing)</span>
                    )}
                  </div>
                </div>
                
                <textarea
                  value={editedOutput}
                  onChange={(e) => setEditedOutput(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary font-mono text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="px-4 py-2 bg-fo-light text-fo-dark rounded-lg hover:bg-fo-primary hover:text-white transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Now'}
                  </button>
                  <button
                    onClick={async () => {
                      // Save before closing edit mode
                      await handleSaveDraft();
                      setEditing(false);
                    }}
                    disabled={saving}
                    className="px-4 py-2 border border-fo-light text-fo-dark rounded-lg hover:bg-fo-light transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Done Editing'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div 
                  className="prose max-w-none bg-fo-light/30 p-6 rounded-lg whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: getDisplayContent()
                  }}
                />
                {/* Refinement Input */}
                <div className="mt-6 space-y-2">
                  <label className="block text-sm font-semibold text-fo-dark">
                    Refinement Instructions
                  </label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter your feedback or changes you'd like made to the output..."
                    rows={4}
                    className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary text-sm"
                  />
                  <button
                    onClick={handleRefine}
                    disabled={refining || !customInput.trim()}
                    className="px-4 py-2 bg-fo-secondary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {refining ? 'Refining...' : 'Refine Output'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Save & Approve Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-3">
            {/* Status Badge */}
            {execution.status === 'draft' && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                <span className="font-semibold">Status:</span>
                <span>Draft (not saved)</span>
              </div>
            )}
            {execution.status === 'in_progress' && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
                <span className="font-semibold">Status:</span>
                <span>In Progress (saved)</span>
              </div>
            )}
            {execution.status === 'approved' && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                <span className="font-semibold">Status:</span>
                <span>✅ Approved</span>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving || execution.status === 'approved'}
                className="flex-1 px-6 py-3 bg-fo-primary text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Saving...' : 'Save as In Progress'}
              </button>
              
              <button
                onClick={handleDirectApprove}
                disabled={execution.status === 'approved'}
                className="flex-1 px-6 py-3 bg-fo-green text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {execution.status === 'approved' ? '✅ Approved' : 'Approve & Send'}
              </button>
            </div>
            
            <p className="text-xs text-fo-text-secondary text-center">
              {execution.status === 'approved' 
                ? 'This play has been approved and the GTM Engineer has been notified.'
                : 'Click "Save as In Progress" to save your work, or "Approve & Send" to finalize and notify the GTM Engineer.'}
            </p>
          </div>
        </div>
      )}

      {/* Generation Loading Modal */}
      {showLoadingModal && (
        <PlayGenerationLoader
          progress={generationProgress}
          currentStep={generationStep}
          playName={play?.name || `Play ${code}`}
        />
      )}
    </div>
  );
}

export default function PlayExecutionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading play...</p>
        </div>
      </div>
    }>
      <PlayExecutionPageContent />
    </Suspense>
  );
}

