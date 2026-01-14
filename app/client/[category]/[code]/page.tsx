'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

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

export default function PlayExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  const code = params.code as string;

  const [play, setPlay] = useState<Play | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [refining, setRefining] = useState(false);

  // Form state
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [editedOutput, setEditedOutput] = useState('');

  const loadPlayAndWorkspaceData = useCallback(async () => {
    try {
      // Load play details
      const playResponse = await fetch(`/api/client/plays?category=${category}`);
      const playData = await playResponse.json();
      const foundPlay = playData.plays?.find((p: Play) => p.code === code);
      setPlay(foundPlay || null);

      // Load workspace data
      const workspaceResponse = await fetch('/api/client/workspace-data');
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

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load play data');
      setLoading(false);
    }
  }, [code, category]);

  useEffect(() => {
    loadPlayAndWorkspaceData();
  }, [loadPlayAndWorkspaceData]);

  const handleExecute = async () => {
    if (!selectedPersona || selectedUseCases.length === 0 || !customInput.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setExecuting(true);
    try {
      const runtimeContext = {
        personas: workspaceData?.personas.filter(p => p.oId === selectedPersona) || [],
        useCases: workspaceData?.useCases.filter(uc => selectedUseCases.includes(uc.oId)) || [],
        clientReferences: workspaceData?.clientReferences.filter(r => selectedReferences.includes(r.oId)) || [],
        customInput: customInput.trim()
      };

      const response = await fetch('/api/client/execute-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playCode: code,
          runtimeContext
        })
      });

      const result = await response.json();

      if (result.success) {
        setExecution({
          id: result.execution.id,
          output: result.execution.output,
          status: 'draft'
        });
        setEditedOutput(result.execution.output.content || JSON.stringify(result.execution.output, null, 2));
        toast.success('Play executed successfully!');
      } else {
        toast.error(result.error || 'Failed to execute play');
      }
    } catch (error) {
      console.error('Error executing play:', error);
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

    setRefining(true);
    try {
      const runtimeContext = {
        personas: workspaceData?.personas.filter(p => p.oId === selectedPersona) || [],
        useCases: workspaceData?.useCases.filter(uc => selectedUseCases.includes(uc.oId)) || [],
        clientReferences: workspaceData?.clientReferences.filter(r => selectedReferences.includes(r.oId)) || [],
        customInput: customInput.trim()
      };

      const response = await fetch('/api/client/execute-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playCode: code,
          runtimeContext,
          refinementPrompt: customInput.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        setExecution({
          id: result.execution.id,
          output: result.execution.output,
          status: 'draft'
        });
        setEditedOutput(result.execution.output.content || JSON.stringify(result.execution.output, null, 2));
        toast.success('Output refined successfully!');
      } else {
        toast.error(result.error || 'Failed to refine output');
      }
    } catch (error) {
      console.error('Error refining:', error);
      toast.error('Failed to refine output');
    } finally {
      setRefining(false);
    }
  };

  const handleSaveDraft = async () => {
    // Save edited output as draft
    toast.success('Draft saved');
  };

  const highlightVariables = (text: string) => {
    // Octave elements (blue): {{persona}}, {{use_case}}, {{reference}}, {{competitor}}, {{lead_magnet}}, {{segment}}
    // Assumptions/messaging (orange): {{problem}}, {{solution}}, {{pain_point}}, {{benefit}}, {{challenge}}
    
    const octavePattern = /\{\{(persona|use_case|reference|competitor|lead_magnet|segment)\}\}/gi;
    const assumptionPattern = /\{\{(problem|solution|pain_point|benefit|challenge)\}\}/gi;
    
    let highlighted = text
      .replace(octavePattern, (match) => `<span class="bg-fo-primary/20 text-fo-primary font-semibold px-1 rounded">${match}</span>`)
      .replace(assumptionPattern, (match) => `<span class="bg-fo-orange/20 text-fo-orange font-semibold px-1 rounded">${match}</span>`);
    
    return highlighted;
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
          ← Back to {category} plays
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/client/${category}`} className="text-fo-primary hover:underline mb-2 inline-block">
          ← Back to {category} plays
        </Link>
        <h1 className="text-3xl font-bold text-fo-dark mb-2">{play.name}</h1>
        <p className="text-fo-text-secondary">Play Code: {play.code}</p>
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
                Select Use Cases <span className="text-fo-orange">*</span>
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
                Select Client References (Optional)
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

            {/* Custom Input */}
            <div>
              <label className="block text-sm font-semibold text-fo-dark mb-2">
                Describe Your Idea <span className="text-fo-orange">*</span>
              </label>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Describe your idea or thought on this play (2-3 sentences)..."
                rows={4}
                className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={executing || !selectedPersona || selectedUseCases.length === 0 || !customInput.trim()}
              className="w-full px-6 py-3 bg-fo-primary text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {executing ? 'Executing Play...' : 'Run Play'}
            </button>
          </div>
        </div>
      ) : (
        // Output Display and Editing
        <div className="space-y-6">
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
                    <button
                      onClick={handleRefine}
                      disabled={refining}
                      className="px-4 py-2 bg-fo-secondary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
                    >
                      {refining ? 'Refining...' : 'Refine'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-4">
                <textarea
                  value={editedOutput}
                  onChange={(e) => setEditedOutput(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary font-mono text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      handleSaveDraft();
                    }}
                    className="px-4 py-2 bg-fo-light text-fo-dark rounded-lg hover:bg-fo-primary hover:text-white transition-all"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-fo-light text-fo-dark rounded-lg hover:bg-fo-light transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="prose max-w-none bg-fo-light/30 p-6 rounded-lg"
                dangerouslySetInnerHTML={{ 
                  __html: highlightVariables(execution.output.content || JSON.stringify(execution.output, null, 2))
                }}
              />
            )}
          </div>

          {/* Variable Legend */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-fo-dark mb-4">Variable Legend</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-fo-dark mb-2">Octave Elements</p>
                <div className="space-y-1">
                  <span className="inline-block bg-fo-primary/20 text-fo-primary px-2 py-1 rounded text-xs mr-2">persona</span>
                  <span className="inline-block bg-fo-primary/20 text-fo-primary px-2 py-1 rounded text-xs mr-2">use_case</span>
                  <span className="inline-block bg-fo-primary/20 text-fo-primary px-2 py-1 rounded text-xs mr-2">reference</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-fo-dark mb-2">Assumptions/Messaging</p>
                <div className="space-y-1">
                  <span className="inline-block bg-fo-orange/20 text-fo-orange px-2 py-1 rounded text-xs mr-2">problem</span>
                  <span className="inline-block bg-fo-orange/20 text-fo-orange px-2 py-1 rounded text-xs mr-2">solution</span>
                  <span className="inline-block bg-fo-orange/20 text-fo-orange px-2 py-1 rounded text-xs mr-2">pain_point</span>
                </div>
              </div>
            </div>
          </div>

          {/* Approve Button */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/client/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      executionId: execution.id
                    })
                  });

                  const result = await response.json();

                  if (result.success) {
                    toast.success('Approval request created!');
                    router.push(`/client/approve/${result.approval.shareableToken}`);
                  } else {
                    toast.error(result.error || 'Failed to create approval');
                  }
                } catch (error) {
                  console.error('Error creating approval:', error);
                  toast.error('Failed to create approval');
                }
              }}
              className="w-full px-6 py-3 bg-fo-green text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all"
            >
              Approve & Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

