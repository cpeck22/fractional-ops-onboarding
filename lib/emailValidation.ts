/**
 * List of personal email domains that should be blocked
 */
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.es',
  'hotmail.it',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'yandex.com',
  'mail.com',
  'gmx.com',
  'gmx.de',
  'gmx.fr',
  'gmx.es',
  'gmx.it',
  'inbox.com',
  'fastmail.com',
  'tutanota.com',
  'hey.com',
  'pm.me',
  'mail.ru',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'rediffmail.com',
  'rocketmail.com',
  'aim.com',
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'cox.net',
  'charter.net',
  'earthlink.net',
  'juno.com',
  'netzero.com',
  'optonline.net',
  'roadrunner.com',
  'ymail.com',
  'ymail.co.uk',
  'btinternet.com',
  'sky.com',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'laposte.net',
  'libero.it',
  'alice.it',
  'tiscali.it',
  'virgilio.it',
  't-online.de',
  'web.de',
  'gmx.at',
  'gmx.ch',
  'bluewin.ch',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'ig.com.br',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'mail.yahoo.co.jp',
  'yahoo.co.jp',
];

/**
 * Extracts the domain from an email address
 */
export function extractEmailDomain(email: string): string {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) {
    return '';
  }
  return parts[1];
}

/**
 * Checks if an email address is from a personal email domain
 * @param email - The email address to check
 * @returns true if the email is from a personal domain, false otherwise
 */
export function isPersonalEmail(email: string): boolean {
  const domain = extractEmailDomain(email);
  if (!domain) {
    return false; // Invalid email format, let other validation handle it
  }
  
  return PERSONAL_EMAIL_DOMAINS.includes(domain);
}

/**
 * Gets a user-friendly error message for personal email domains
 */
export function getPersonalEmailErrorMessage(email: string): string {
  const domain = extractEmailDomain(email);
  return `Please enter a different email address. This form does not accept addresses from ${domain}. Please use your work or business email address.`;
}

