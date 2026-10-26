const crypto = require('crypto');

function generateShortCode() {
  return crypto.randomBytes(4).toString('base64url').substring(0, 6);
}

function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    if (url.protocol === 'javascript:') {
      return false;
    }

    const host = url.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { generateShortCode, isValidUrl };
