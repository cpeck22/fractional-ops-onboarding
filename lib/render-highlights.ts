/**
 * Convert highlighted XML tags to styled HTML spans
 * Takes the XML output from OpenAI and converts it to HTML with proper styling
 */
export function renderHighlightedContent(highlightedXml: string): string {
  if (!highlightedXml) return '';
  
  let html = highlightedXml;
  
  // Map XML tags to styled HTML spans with appropriate colors
  // Octave Elements (blue/primary)
  html = html.replace(/<persona>(.*?)<\/persona>/gi, (match, content) => {
    return `<span class="bg-fo-primary/20 text-fo-primary font-semibold px-1 rounded cursor-help" title="Persona: ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<segment>(.*?)<\/segment>/gi, (match, content) => {
    return `<span class="bg-fo-primary/20 text-fo-primary font-semibold px-1 rounded cursor-help" title="Segment: ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<usecase_outcome>(.*?)<\/usecase_outcome>/gi, (match, content) => {
    return `<span class="bg-fo-primary/20 text-fo-primary font-semibold px-1 rounded cursor-help" title="Use Case (Desired Outcome): ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<usecase_blocker>(.*?)<\/usecase_blocker>/gi, (match, content) => {
    return `<span class="bg-fo-primary/20 text-fo-primary font-semibold px-1 rounded cursor-help" title="Use Case (Problem/Blocker): ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<cta_leadmagnet>(.*?)<\/cta_leadmagnet>/gi, (match, content) => {
    return `<span class="bg-fo-primary/20 text-fo-primary font-semibold px-1 rounded cursor-help" title="CTA (Lead Magnet): ${escapeHtml(content)}">${content}</span>`;
  });
  
  // Personalization (orange)
  html = html.replace(/<personalization>(.*?)<\/personalization>/gi, (match, content) => {
    return `<span class="bg-fo-orange/20 text-fo-orange font-semibold px-1 rounded cursor-help" title="Personalized / Claire Generated Info: ${escapeHtml(content)}">${content}</span>`;
  });
  
  // Handle nested tags (if any) - process personalization first since it might be nested
  // This is a simple approach - for more complex nesting, consider a proper XML parser
  
  return html;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  if (typeof window !== 'undefined' && window.document) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  // Server-side fallback
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if content has highlights (contains XML tags)
 */
export function hasHighlights(content: string): boolean {
  if (!content) return false;
  return /<(persona|segment|usecase_outcome|usecase_blocker|cta_leadmagnet|personalization)>/i.test(content);
}

