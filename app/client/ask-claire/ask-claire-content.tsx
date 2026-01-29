'use client';

import Image from 'next/image';
import { MessageCircle, Sparkles, Zap, Brain } from 'lucide-react';

export default function AskClairePageContent() {
  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Ask Claire</h1>
        <p className="text-fo-text-secondary">
          Your AI-powered marketing assistant for campaigns, strategies, and more.
        </p>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-fo-border flex flex-col overflow-hidden relative">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-fo-primary/5 via-white to-fo-primary/10 z-10 flex items-center justify-center">
          <div className="text-center px-8 py-12 max-w-2xl">
            {/* Claire's Image with Animated Glow */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-fo-primary/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-full p-6 shadow-2xl border-4 border-fo-primary/20">
                <Image
                  src="/Fractional-Ops_Symbol_Main.png"
                  alt="Claire AI"
                  width={120}
                  height={120}
                  className="rounded-full"
                />
              </div>
              {/* Floating Sparkles */}
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-fo-primary animate-bounce" />
              <Zap className="absolute -bottom-2 -left-2 w-8 h-8 text-fo-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>

            {/* Coming Soon Badge */}
            <div className="inline-flex items-center gap-2 bg-fo-primary/10 border-2 border-fo-primary/30 px-6 py-2 rounded-full mb-6">
              <Sparkles className="w-5 h-5 text-fo-primary animate-pulse" />
              <span className="text-fo-primary font-bold text-lg">Coming Soon</span>
              <Sparkles className="w-5 h-5 text-fo-primary animate-pulse" />
            </div>

            {/* Main Message */}
            <h2 className="text-3xl font-bold text-fo-dark mb-4">
              Chat with Claire is Almost Here!
            </h2>
            <p className="text-lg text-fo-text-secondary mb-8">
              We&apos;re putting the finishing touches on Claire&apos;s conversational AI. Soon you&apos;ll be able to ask questions, 
              get strategy advice, and generate content through natural conversation.
            </p>

            {/* Feature Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-fo-border shadow-sm">
                <MessageCircle className="w-8 h-8 text-fo-primary mx-auto mb-2" />
                <h3 className="font-semibold text-fo-dark text-sm mb-1">Real-time Chat</h3>
                <p className="text-xs text-fo-text-secondary">Instant answers to your marketing questions</p>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-fo-border shadow-sm">
                <Brain className="w-8 h-8 text-fo-primary mx-auto mb-2" />
                <h3 className="font-semibold text-fo-dark text-sm mb-1">Strategy Insights</h3>
                <p className="text-xs text-fo-text-secondary">Deep analysis of your GTM approach</p>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-fo-border shadow-sm">
                <Zap className="w-8 h-8 text-fo-primary mx-auto mb-2" />
                <h3 className="font-semibold text-fo-dark text-sm mb-1">Content Generation</h3>
                <p className="text-xs text-fo-text-secondary">On-demand campaign and copy creation</p>
              </div>
            </div>

            {/* Status Message */}
            <div className="bg-fo-primary/5 border border-fo-primary/20 rounded-lg p-4">
              <p className="text-sm text-fo-dark">
                <span className="font-semibold">🔧 In Development:</span> Our team is finalizing the API integration. 
                We&apos;ll notify you as soon as Ask Claire goes live!
              </p>
            </div>
          </div>
        </div>

        {/* Preview of Chat Interface (Disabled) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 opacity-30">
          <div className="text-center text-fo-text-secondary py-12">
            <p className="text-lg mb-2">Start a conversation with Claire</p>
            <p className="text-sm">Ask questions about your campaigns, get strategy advice, or request content generation.</p>
          </div>
        </div>

        {/* Disabled Input (Preview) */}
        <div className="border-t border-fo-border p-4 opacity-30">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                placeholder="Ask Claire anything... (Coming Soon)"
                rows={3}
                className="w-full px-4 py-2 border border-fo-border rounded-lg resize-none cursor-not-allowed bg-gray-50"
                disabled
              />
              {/* Claire's Avatar in Input */}
              <div className="absolute top-2 right-2">
                <Image
                  src="/Fractional-Ops_Symbol_Main.png"
                  alt="Claire"
                  width={32}
                  height={32}
                  className="rounded-full opacity-50"
                />
              </div>
            </div>
            <button
              disabled
              className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
