import {load} from 'cheerio';
import CryptoJS from 'crypto-js';

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';
import {parseURL} from '../../../../../../../core/utils/urlUtils';
import {Subtitle} from '../../../../../../../features/plugins/data/model/media/Subtitle';
import detectSubtitleMimeType from '../../../../../../../core/utils/detectSubtitleMimeType';

const substringAfter = (str: string, delimiter: string): string => {
  const index = str.indexOf(delimiter);
  return index === -1 ? '' : str.substring(index + delimiter.length);
};

const substringBefore = (str: string, delimiter: string): string => {
  const index = str.indexOf(delimiter);
  return index === -1 ? str : str.substring(0, index);
};

interface Intro {
  start: number;
  end: number;
}

class RapidCloud implements Extractor {
  name = 'RapidCloud';

  private readonly fallbackKey = 'c1d17096f2ca11b7';
  private readonly host = 'https://rapid-cloud.co';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const result: {
      sources: RawVideo[];
      subtitles: Subtitle[];
      intro?: Intro;
      outro?: Intro;
    } = {
      sources: [],
      subtitles: [],
    };

    try {
      const videoUrl = parseURL(data.url);
      const id = data.url.split('/').pop()?.split('?')[0];
      const options = {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      };

      const res = await axiosClient.get(
        `https://${videoUrl.hostname}/embed-2/v2/e-1/getSources?id=${id}`,
        options,
      );
      console.log(res.data);

      let {
        data: {sources, tracks, intro, outro, encrypted},
      } = res;

      let decryptKey = await (
        await axiosClient.get(
          'https://raw.githubusercontent.com/cinemaxhq/keys/e1/key',
        )
      ).data;

      decryptKey = substringBefore(
        substringAfter(decryptKey, '"blob-code blob-code-inner js-file-line">'),
        '</td>',
      );

      if (!decryptKey) {
        decryptKey = await (
          await axiosClient.get(
            'https://raw.githubusercontent.com/cinemaxhq/keys/e1/key',
          )
        ).data;
      }
      console.log(decryptKey);

      if (!decryptKey) decryptKey = this.fallbackKey;

      try {
        if (encrypted) {
          // If the fetched key is a JSON string like '[[21,7],[...]]', parse it into an array
          if (
            typeof decryptKey === 'string' &&
            decryptKey.trim().startsWith('[')
          ) {
            try {
              decryptKey = JSON.parse(decryptKey);
            } catch (e) {
              // keep as string if parse fails
            }
          }

          // Use the original response string for index-based extraction to avoid mismatches
          const responseSourcesStr =
            typeof res?.data?.sources === 'string'
              ? res.data.sources
              : typeof sources === 'string'
              ? sources
              : '';

          const originalSources = responseSourcesStr.split('');
          const maskedSources = originalSources.slice();

          let extractedKey = '';
          let currentIndex = 0;

          if (Array.isArray(decryptKey)) {
            for (const pair of decryptKey) {
              const start = Number(pair[0]) + currentIndex;
              const len = Number(pair[1]);
              const end = start + len;
              for (let i = start; i < end && i < originalSources.length; i++) {
                extractedKey += originalSources[i];
                maskedSources[i] = '';
              }
              currentIndex += len;
            }
          } else {
            // If decryptKey is not an array, use it directly (fallback to string)
            extractedKey = String(decryptKey || '');
          }

          // If extraction didn't produce a key, fall back
          decryptKey = extractedKey || this.fallbackKey;
          sources = maskedSources.join('');

          // Debug logs to help diagnose extraction issues
          console.log(
            'RapidCloud raw decryptKey (post-parse):',
            JSON.stringify(decryptKey),
          );
          console.log('RapidCloud extractedKey (raw):', extractedKey);
          console.log('RapidCloud extractedKey length:', extractedKey.length);
          console.log(
            'RapidCloud masked sources (prefix):',
            sources ? sources.substring(0, 120) : '(empty)',
          );

          // Prefer using the extractedKey (if present) as the passphrase (OpenSSL-compatible)
          const passphrase =
            extractedKey ||
            (typeof decryptKey === 'string'
              ? decryptKey
              : String(decryptKey)) ||
            this.fallbackKey;
          console.log(
            'RapidCloud using passphrase (length):',
            (passphrase || '').length,
          );

          let decryptedText = '';
          let lastErr: any = null;

          // Helper: EVP_BytesToKey-like derivation using MD5 to match OpenSSL's key+iv generation
          const evpBytesToKey = (
            secretPass: string,
            saltWA: CryptoJS.lib.WordArray | null,
            keyBytes: number,
            ivBytes: number,
          ) => {
            const salt = saltWA || CryptoJS.lib.WordArray.create();
            let derived = CryptoJS.lib.WordArray.create();
            let block: CryptoJS.lib.WordArray | undefined = undefined;

            while (derived.sigBytes < keyBytes + ivBytes) {
              if (block) {
                block = CryptoJS.MD5(
                  block
                    .concat(CryptoJS.enc.Utf8.parse(secretPass))
                    .concat(salt),
                );
              } else {
                block = CryptoJS.MD5(
                  CryptoJS.enc.Utf8.parse(secretPass).concat(salt),
                );
              }
              derived = derived.concat(block);
            }

            const derivedHex = CryptoJS.enc.Hex.stringify(derived);
            const keyHex = derivedHex.substr(0, keyBytes * 2);
            const ivHex = derivedHex.substr(keyBytes * 2, ivBytes * 2);
            return {
              key: CryptoJS.enc.Hex.parse(keyHex),
              iv: CryptoJS.enc.Hex.parse(ivHex),
            };
          };

          // Helper: parse OpenSSL salted Base64 ("Salted__" + 8 bytes salt + ciphertext)
          const parseOpenSSLCipher = (b64: string) => {
            try {
              const wa = CryptoJS.enc.Base64.parse(b64);
              const hex = CryptoJS.enc.Hex.stringify(wa);
              // "Salted__" in hex is 53616c7465645f5f
              if (hex.startsWith('53616c7465645f5f')) {
                const saltHex = hex.substr(16, 16); // next 8 bytes (16 hex chars)
                const cipherHex = hex.substr(32);
                return {
                  salt: CryptoJS.enc.Hex.parse(saltHex),
                  ciphertext: CryptoJS.enc.Hex.parse(cipherHex),
                };
              } else {
                return {salt: null, ciphertext: wa};
              }
            } catch (e) {
              return {salt: null, ciphertext: null};
            }
          };

          try {
            // First attempt: let CryptoJS handle passphrase (works for many OpenSSL salted payloads)
            console.log(
              'RapidCloud decrypt attempt: passphrase-string (direct)',
            );
            try {
              decryptedText = CryptoJS.AES.decrypt(
                sources,
                passphrase,
              ).toString(CryptoJS.enc.Utf8);
            } catch (e) {
              lastErr = e;
              decryptedText = '';
            }

            // If that failed, do explicit OpenSSL-compatible decode + EVP key derivation + AES-CBC decrypt
            if (
              !decryptedText &&
              typeof sources === 'string' &&
              sources.startsWith('U2FsdGVk')
            ) {
              console.log(
                'RapidCloud decrypt attempt: explicit OpenSSL EVP_BytesToKey + AES-CBC',
              );
              const parsed = parseOpenSSLCipher(sources);
              if (!parsed || !parsed.ciphertext) {
                lastErr = new Error('Failed to parse OpenSSL ciphertext');
              } else {
                // Try AES-256-CBC (32-byte key + 16-byte iv)
                try {
                  const kv = evpBytesToKey(passphrase, parsed.salt, 32, 16);
                  const cipherParams = CryptoJS.lib.CipherParams.create({
                    ciphertext: parsed.ciphertext,
                  });
                  const dec = CryptoJS.AES.decrypt(
                    cipherParams as any,
                    kv.key,
                    {
                      iv: kv.iv,
                      mode: CryptoJS.mode.CBC,
                      padding: CryptoJS.pad.Pkcs7,
                    },
                  );
                  decryptedText = dec.toString(CryptoJS.enc.Utf8);
                  if (decryptedText) {
                    console.log(
                      'RapidCloud decrypt succeeded with AES-256 EVP method',
                    );
                  }
                } catch (e) {
                  lastErr = e;
                  decryptedText = '';
                }

                // If still empty, try AES-128-CBC (16-byte key)
                if (!decryptedText) {
                  try {
                    const kv128 = evpBytesToKey(
                      passphrase,
                      parsed.salt,
                      16,
                      16,
                    );
                    const cipherParams = CryptoJS.lib.CipherParams.create({
                      ciphertext: parsed.ciphertext,
                    });
                    const dec128 = CryptoJS.AES.decrypt(
                      cipherParams as any,
                      kv128.key,
                      {
                        iv: kv128.iv,
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7,
                      },
                    );
                    decryptedText = dec128.toString(CryptoJS.enc.Utf8);
                    if (decryptedText) {
                      console.log(
                        'RapidCloud decrypt succeeded with AES-128 EVP method',
                      );
                    }
                  } catch (e) {
                    lastErr = e;
                    decryptedText = '';
                  }
                }
              }
            }

            // Final sanity-check: ensure JSON-like result
            if (decryptedText) {
              const trimmed = decryptedText.trim();
              if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                console.log('RapidCloud decrypt produced JSON-like result');
              } else {
                console.log(
                  'RapidCloud decrypt produced non-JSON result:',
                  decryptedText.substring(0, 120),
                );
                decryptedText = '';
              }
            }
          } catch (e) {
            lastErr = e;
            decryptedText = '';
          }

          if (!decryptedText) {
            // Final fallback: try Python-style approach used in some RapidCloud extractors
            // - Use the extractedKey as a UTF-8 string, pad/truncate to 16 bytes
            // - Use a zero IV (16 bytes of zeros)
            // - Treat `sources` as base64 ciphertext and AES-CBC decrypt with PKCS7 padding
            try {
              console.log(
                'RapidCloud decrypt attempt: python-style key (pad/truncate to 16) + zero IV',
              );

              const padTo16 = (s: string) => {
                let keyStr = String(s || '');
                // pad with null chars to next multiple, then take first 16 chars
                if (keyStr.length % 16 !== 0) {
                  const padLen = 16 - (keyStr.length % 16);
                  keyStr = keyStr + '\0'.repeat(padLen);
                }
                keyStr = keyStr.substring(0, 16);
                return keyStr;
              };

              const pythonKeyStr = padTo16(
                extractedKey || decryptKey || this.fallbackKey,
              );
              const keyWA = CryptoJS.enc.Utf8.parse(pythonKeyStr);
              const zeroIv = CryptoJS.enc.Utf8.parse('\0'.repeat(16));

              const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(sources),
              });

              const dec = CryptoJS.AES.decrypt(cipherParams as any, keyWA, {
                iv: zeroIv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
              });

              const candidate = dec.toString(CryptoJS.enc.Utf8);
              if (candidate) {
                const trimmed = candidate.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                  console.log(
                    'RapidCloud decrypt produced JSON-like result with python-style fallback',
                  );
                  decryptedText = candidate;
                } else {
                  console.log(
                    'RapidCloud python-style decrypt produced non-JSON result:',
                    candidate.substring(0, 120),
                  );
                }
              }
            } catch (e) {
              console.log('RapidCloud python-style decrypt error:', e);
            }
          }

          if (!decryptedText) {
            throw new Error(
              `Cannot decrypt sources. No valid UTF-8 JSON produced. Last error: ${lastErr}`,
            );
          }

          try {
            sources = JSON.parse(decryptedText);
          } catch (e) {
            throw new Error(
              'Decryption succeeded but JSON.parse failed on result.',
            );
          }
        }
      } catch (err) {
        console.log('RapidCloud decrypt error:', err);
        // Rethrow so we don't continue with an un-decrypted `sources` (which causes downstream crashes)
        throw new Error(
          'Cannot decrypt RapidCloud sources: ' +
            ((err as Error)?.message || String(err)),
        );
      }

      console.log('sources', sources);

      // Map sources to RawVideo format
      const sourcesData =
        sources?.map((s: any) => ({
          url: s.file,
          isM3U8: s.file.includes('.m3u8'),
          name: this.name,
          type: MediaType.RawVideo,
        })) || [];

      result.sources.push(...sourcesData);

      // Handle M3U8 quality variants if from rapid-cloud domain
      if (data.url.includes(parseURL(this.host).hostname)) {
        result.sources = [];
        for (const source of sources) {
          const {data: m3u8Data} = await axiosClient.get(source.file, options);
          const m3u8Lines = m3u8Data
            .split('\n')
            .filter(
              (line: string) =>
                line.includes('.m3u8') && line.includes('RESOLUTION='),
            );

          const secondHalf = m3u8Lines.map((line: string) =>
            line
              .match(/RESOLUTION=.*,(C)|URI=.*/g)
              ?.map((s: string) => s.split('=')[1]),
          );

          const TdArray = secondHalf.map((s: string[]) => {
            const f1 = s[0]?.split(',C')[0];
            const f2 = s[1]?.replace(/"/g, '');

            return [f1, f2];
          });

          for (const [f1, f2] of TdArray) {
            result.sources.push({
              url: `${source.file?.split('master.m3u8')[0]}${f2.replace(
                'iframes',
                'index',
              )}`,
              isM3U8: f2.includes('.m3u8'),
              name: `${this.name} ${f1.split('x')[1]}p`,
              type: MediaType.RawVideo,
            });
          }
        }
      }

      // Add intro/outro information
      result.intro =
        intro?.end > 1 ? {start: intro.start, end: intro.end} : undefined;
      result.outro =
        outro?.end > 1 ? {start: outro.start, end: outro.end} : undefined;

      // Add auto quality source
      if (sources && sources.length > 0) {
        result.sources.push({
          url: sources[0].file,
          isM3U8: sources[0].file.includes('.m3u8'),
          name: `${this.name} Auto`,
          type: MediaType.RawVideo,
        });
      }

      // Map subtitles
      result.subtitles = tracks
        .map((s: any) =>
          s.file
            ? {
                url: s.file,
                language: s.label ? s.label : 'Thumbnails',
                name: s.label ? s.label : 'Thumbnails',
                mimeType: detectSubtitleMimeType(s.file),
              }
            : null,
        )
        .filter((s: any) => s);

      return result.sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  private captcha = async (url: string, key: string): Promise<string> => {
    const uri = parseURL(url);
    const domain = uri.protocol + '//' + uri.hostname;

    const {data} = await axiosClient.get(
      `https://www.google.com/recaptcha/api.js?render=${key}`,
      {
        headers: {
          Referer: domain,
        },
      },
    );

    const v = data
      ?.substring(data.indexOf('/releases/'), data.lastIndexOf('/recaptcha'))
      .split('/releases/')[1];

    //TODO: NEED to fix the co (domain) parameter to work with every domain
    const anchor = `https://www.google.com/recaptcha/api2/anchor?ar=1&hl=en&size=invisible&cb=kr42069kr&k=${key}&co=aHR0cHM6Ly9yYXBpZC1jbG91ZC5ydTo0NDM.&v=${v}`;
    const c = load((await axiosClient.get(anchor)).data)(
      '#recaptcha-token',
    ).attr('value');

    // currently its not returning proper response. not sure why
    const res = await axiosClient.post(
      `https://www.google.com/recaptcha/api2/reload?k=${key}`,
      {
        v: v,
        k: key,
        c: c,
        co: 'aHR0cHM6Ly9yYXBpZC1jbG91ZC5ydTo0NDM.',
        sa: '',
        reason: 'q',
      },
      {
        headers: {
          Referer: anchor,
        },
      },
    );

    return res.data.substring(
      res.data.indexOf('rresp","'),
      res.data.lastIndexOf('",null'),
    );
  };
}

class RapidCloudInfo implements ExtractorInfo {
  id: string = 'rapidcloud';
  patterns: RegExp[] = [/rapid-cloud\./, /rapidcloud\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new RapidCloud()];
}

export default RapidCloudInfo;
