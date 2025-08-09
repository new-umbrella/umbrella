const CryptoJS = require('crypto-js');
const crypto = require('crypto');

/**
 * Node-native decrypt test for RapidCloud (Rabbitstream) payloads.
 *
 * This script implements the Kotlin/Java approach exactly using Node's crypto:
 * - base64 decode the input
 * - extract salt = bytes[8..15] when "Salted__" prefix is present
 * - generateKey(salt, secretBytes) using MD5 chaining (produce 48 bytes)
 * - use first 32 bytes as AES-256 key and next 16 bytes as IV, try AES-256-CBC
 * - fallback to AES-128-CBC using first 16 bytes as key and next 16 as IV
 *
 * Usage: node tmp/decrypt_test.js
 *
 * Replace the `encrypted` and `extractedKey` variables with samples from your logs.
 */

const encrypted =
  'U2FsdGVkX1+LnXtyLMh/tMwbzcM49fu/y2i1+0G9zYpgcPoqXb8pl6z14cVkY6NDRX6hYFK2PH7TfSpHEr4r4e+RBqRH7euaUpPCJmKimko4lLww2Am509bmwene5Q3ges+Uz3gn+eMtMhhlA+7lsqGGQRkCpZw7gDdSZFuDyftye5A9QGpGTxGPYqBrUKkK4K1xH/CIL4sV4iqOr2dzqSC/DeX8uG21UHBPapSD4+SZJRrHdjfcEnxFekrDngXJFQp1EoXq53Sob2w45mN71BYzgRTgEbUm2vtkr0XEA1p5xMkv9Mz9se8XL7KZKXTflXeqlzzB9FttAxB8tU1EtkRSMJto1onSCjm3AQe3tizdh09X06/loEO2J9NDdU88foX2FwqkCR/z9e60iTdmyoyxo0mSSuW0gpoA95TJ2qoqhrR3F3jKxI7MfiydH+VEDLtmJSHzx6B89HprjLpxYQ==';

// Index pairs provided (use these to extract the passphrase from the encrypted string)
const indexPairs = [
  [21, 7],
  [21, 7],
  [77, 6],
  [79, 7],
  [108, 6],
  [120, 7],
  [193, 6],
];

/**
 * Extract the key by pulling character segments from the sources string
 * according to the index pairs (start offset, length), matching extractor logic.
 */
function extractKeyFromSources(sources, pairs) {
  const arr = sources.split('');
  let extracted = '';
  let currentIndex = 0;
  for (const pair of pairs) {
    const start = Number(pair[0]) + currentIndex;
    const len = Number(pair[1]);
    const end = start + len;
    for (let i = start; i < end && i < arr.length; i++) {
      extracted += arr[i];
      arr[i] = '';
    }
    currentIndex += len;
  }
  return {extracted, masked: arr.join('')};
}

const {extracted: extractedKey} = extractKeyFromSources(encrypted, indexPairs);
console.log('Derived extractedKey from index pairs:', extractedKey);

function md5(buf) {
  return crypto.createHash('md5').update(buf).digest();
}

function generateKeyKotlin(saltBuf, secretBuf) {
  // Kotlin generateKey: md5(secret + salt) then loop md5(previous + secret + salt) until 48 bytes
  let key = md5(Buffer.concat([secretBuf, saltBuf]));
  let currentKey = Buffer.from(key);
  while (currentKey.length < 48) {
    key = md5(Buffer.concat([key, secretBuf, saltBuf]));
    currentKey = Buffer.concat([currentKey, key]);
  }
  return currentKey.slice(0, 48); // 48 bytes
}

function tryNodeCryptoDecrypt(encryptedB64, secretStr) {
  try {
    const raw = Buffer.from(encryptedB64, 'base64');
    const header = raw.slice(0, 8).toString('utf8');
    let salt = null;
    let ciphertext = null;
    if (header === 'Salted__') {
      salt = raw.slice(8, 16);
      ciphertext = raw.slice(16);
    } else {
      // Not OpenSSL salted format
      ciphertext = raw;
    }

    const secretUtf8 = Buffer.from(secretStr, 'utf8');

    console.log('Salt present?', !!salt);
    if (!salt) {
      console.log(
        'No salt detected; cannot apply Rabbitstream/OpenSSL method reliably.',
      );
      return null;
    }

    // Generate the 48-byte key material using Kotlin logic
    const keyMaterial = generateKeyKotlin(salt, secretUtf8); // 48 bytes
    // Try AES-256-CBC
    try {
      const key256 = keyMaterial.slice(0, 32);
      const iv256 = keyMaterial.slice(32, 48);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key256, iv256);
      const out = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      const text = out.toString('utf8');
      return {method: 'aes-256-evp-kotlin', ok: true, text};
    } catch (e) {
      // continue
      // console.log('AES-256 attempt error', e);
    }

    // Try AES-128-CBC
    try {
      const key128 = keyMaterial.slice(0, 16);
      const iv128 = keyMaterial.slice(16, 32);
      const decipher = crypto.createDecipheriv('aes-128-cbc', key128, iv128);
      const out = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      const text = out.toString('utf8');
      return {method: 'aes-128-evp-kotlin', ok: true, text};
    } catch (e) {
      // continue
      // console.log('AES-128 attempt error', e);
    }

    return {ok: false, err: 'No method produced valid UTF-8 output'};
  } catch (e) {
    return {ok: false, err: e};
  }
}

(async () => {
  console.log('Encrypted prefix:', encrypted.substring(0, 24));
  console.log('ExtractedKey:', extractedKey);
  console.log('---- Try Node native EVP (Kotlin logic) decrypt ----');
  const r = tryNodeCryptoDecrypt(encrypted, extractedKey);
  if (!r) {
    console.log('No result');
    process.exit(2);
  }
  if (r.ok) {
    console.log('Success method:', r.method);
    console.log('Decrypted (first 800 chars):\n', r.text.substring(0, 800));
    process.exit(0);
  } else {
    console.log('Decrypt failed:', r.err);
    process.exit(3);
  }
})();
