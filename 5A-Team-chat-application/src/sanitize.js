function makeSafeText(text) {
  if (!text) return "";
  

  let safe = text.split('<').join('&lt;');
  safe = safe.split('>').join('&gt;');
  

  if (safe.length > 1000) {
    safe = safe.substring(0, 1000);
  }
  
  return safe.trim();
}

module.exports = { makeSafeText };