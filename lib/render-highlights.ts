/**
 * Convert highlighted XML tags to styled HTML spans
 * Takes the XML output from OpenAI and converts it to HTML with proper styling
 */
export function renderHighlightedContent(highlightedXml: string): string {
  if (!highlightedXml) return '';
  
  let html = highlightedXml;
  
  // Map XML tags to styled HTML spans with appropriate colors
  // Claire Elements (matching CEO screenshot colors)
  html = html.replace(/<persona>(.*?)<\/persona>/gi, (match, content) => {
    return `<span class="bg-highlight-persona text-fo-dark font-semibold px-1 rounded cursor-help" title="Persona: ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<segment>(.*?)<\/segment>/gi, (match, content) => {
    return `<span class="bg-highlight-segment text-fo-dark font-semibold px-1 rounded cursor-help" title="Segment: ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<usecase_outcome>(.*?)<\/usecase_outcome>/gi, (match, content) => {
    return `<span class="bg-highlight-outcome text-fo-dark font-semibold px-1 rounded cursor-help" title="Use Case (Desired Outcome): ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<usecase_blocker>(.*?)<\/usecase_blocker>/gi, (match, content) => {
    return `<span class="bg-highlight-blocker text-fo-dark font-semibold px-1 rounded cursor-help" title="Use Case (Problem/Blocker): ${escapeHtml(content)}">${content}</span>`;
  });
  
  html = html.replace(/<cta_leadmagnet>(.*?)<\/cta_leadmagnet>/gi, (match, content) => {
    return `<span class="bg-highlight-cta text-fo-dark font-semibold px-1 rounded cursor-help" title="CTA (Lead Magnet): ${escapeHtml(content)}">${content}</span>`;
  });
  
  // Claire Content Agent Personalization (light purple)
  html = html.replace(/<personalization>(.*?)<\/personalization>/gi, (match, content) => {
    return `<span class="bg-highlight-personalized text-fo-dark font-semibold px-1 rounded cursor-help" title="Personalized / Claire Generated Info: ${escapeHtml(content)}">${content}</span>`;
  });
  
  // Handle nested tags (if any) - process personalization first since it might be nested
  // This is a simple approach - for more complex nesting, consider a proper XML parser
  
  // Convert newlines to <br/> tags for proper line break rendering
  html = html.replace(/\n/g, '<br/>');
  
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

