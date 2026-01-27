/**
 * Validate that required placeholders exist in campaign copy
 * Used before copy approval to ensure personalization tokens are intact
 */

export interface PlaceholderValidationResult {
  isValid: boolean;
  missingPlaceholders: string[];
  warnings: string[];
}

// Common required placeholders for campaign copy
const REQUIRED_PLACEHOLDERS = [
  {
    patterns: ['{{first_name}}', '{{firstName}}', '%first_name%'],
    name: 'First Name',
    critical: true
  },
  {
    patterns: ['{{company_name}}', '{{companyName}}', '%company_name%'],
    name: 'Company Name',
    critical: true
  },
  {
    patterns: ['%signature%', '{{signature}}'],
    name: 'Signature',
    critical: true
  }
];

// Optional but recommended placeholders
const RECOMMENDED_PLACEHOLDERS = [
  {
    patterns: ['{{job_title}}', '{{jobTitle}}', '%job_title%'],
    name: 'Job Title',
    critical: false
  },
  {
    patterns: ['{{sl_time_of_day}}', '%sl_time_of_day%'],
    name: 'Time of Day (Smart Send)',
    critical: false
  }
];

/**
 * Validate campaign copy for required placeholders
 */
export function validatePlaceholders(content: string): PlaceholderValidationResult {
  const missingPlaceholders: string[] = [];
  const warnings: string[] = [];

  // Check required placeholders
  for (const placeholder of REQUIRED_PLACEHOLDERS) {
    const hasAnyPattern = placeholder.patterns.some(pattern =>
      content.includes(pattern)
    );

    if (!hasAnyPattern) {
      missingPlaceholders.push(placeholder.name);
    }
  }

  // Check recommended placeholders
  for (const placeholder of RECOMMENDED_PLACEHOLDERS) {
    const hasAnyPattern = placeholder.patterns.some(pattern =>
      content.includes(pattern)
    );

    if (!hasAnyPattern) {
      warnings.push(`Consider adding ${placeholder.name} personalization`);
    }
  }

  // Check for broken placeholders (e.g., {first_name} instead of {{first_name}})
  const brokenPatterns = [
    /\{[a-z_]+\}/g, // Single braces
    /\[\[.*?\]\]/g, // Double square brackets
    /\[INSERT.*?\]/gi // [INSERT X] patterns
  ];

  for (const pattern of brokenPatterns) {
    if (pattern.test(content)) {
      warnings.push('Found potentially broken placeholders. Please verify formatting.');
      break;
    }
  }

  return {
    isValid: missingPlaceholders.length === 0,
    missingPlaceholders,
    warnings
  };
}

/**
 * Check if content has valid personalization tokens
 */
export function hasValidPlaceholders(content: string): boolean {
  const result = validatePlaceholders(content);
  return result.isValid;
}

/**
 * Extract all placeholders from content
 */
export function extractPlaceholders(content: string): string[] {
  const placeholders: string[] = [];
  
  // Match {{placeholder}} pattern
  const doublebraceMatches = content.match(/\{\{[^}]+\}\}/g) || [];
  placeholders.push(...doublebraceMatches);
  
  // Match %placeholder% pattern
  const percentMatches = content.match(/%[a-z_]+%/gi) || [];
  placeholders.push(...percentMatches);
  
  return Array.from(new Set(placeholders));
}
