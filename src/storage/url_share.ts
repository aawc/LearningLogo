const URI_KEY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function lzCompress(uncompressed: string | null): string {
  if (uncompressed === null || uncompressed === '') return '';
  let i: number;
  let value: number;
  const context_dictionary: Record<string, number> = {};
  const context_dictionaryToCreate: Record<string, boolean> = {};
  let context_c = '';
  let context_wc = '';
  let context_w = '';
  let context_enlargeIn = 2;
  let context_dictSize = 3;
  let context_numBits = 2;
  let context_data = '';
  let context_data_val = 0;
  let context_data_position = 0;

  for (let ii = 0; ii < uncompressed.length; ii++) {
    context_c = uncompressed.charAt(ii);
    if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
      context_dictionary[context_c] = context_dictSize++;
      context_dictionaryToCreate[context_c] = true;
    }

    context_wc = context_w + context_c;
    if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
      context_w = context_wc;
    } else {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1;
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data += URI_KEY.charAt(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data += URI_KEY.charAt(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data += URI_KEY.charAt(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === 5) {
              context_data_position = 0;
              context_data += URI_KEY.charAt(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w]!;
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === 5) {
            context_data_position = 0;
            context_data += URI_KEY.charAt(context_data_val);
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
      context_dictionary[context_wc] = context_dictSize++;
      context_w = String(context_c);
    }
  }

  if (context_w !== '') {
    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
      if (context_w.charCodeAt(0) < 256) {
        for (i = 0; i < context_numBits; i++) {
          context_data_val = context_data_val << 1;
          if (context_data_position === 5) {
            context_data_position = 0;
            context_data += URI_KEY.charAt(context_data_val);
            context_data_val = 0;
          } else {
            context_data_position++;
          }
        }
        value = context_w.charCodeAt(0);
        for (i = 0; i < 8; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === 5) {
            context_data_position = 0;
            context_data += URI_KEY.charAt(context_data_val);
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      } else {
        value = 1;
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | value;
          if (context_data_position === 5) {
            context_data_position = 0;
            context_data += URI_KEY.charAt(context_data_val);
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = 0;
        }
        value = context_w.charCodeAt(0);
        for (i = 0; i < 16; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === 5) {
            context_data_position = 0;
            context_data += URI_KEY.charAt(context_data_val);
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
      delete context_dictionaryToCreate[context_w];
    } else {
      value = context_dictionary[context_w]!;
      for (i = 0; i < context_numBits; i++) {
        context_data_val = (context_data_val << 1) | (value & 1);
        if (context_data_position === 5) {
          context_data_position = 0;
          context_data += URI_KEY.charAt(context_data_val);
          context_data_val = 0;
        } else {
          context_data_position++;
        }
        value = value >> 1;
      }
    }
    context_enlargeIn--;
    if (context_enlargeIn === 0) {
      context_enlargeIn = Math.pow(2, context_numBits);
      context_numBits++;
    }
  }

  // Mark the end of the stream with 2
  value = 2;
  for (i = 0; i < context_numBits; i++) {
    context_data_val = (context_data_val << 1) | (value & 1);
    if (context_data_position === 5) {
      context_data_position = 0;
      context_data += URI_KEY.charAt(context_data_val);
      context_data_val = 0;
    } else {
      context_data_position++;
    }
    value = value >> 1;
  }

  // Flush the last bits
  while (true) {
    context_data_val = context_data_val << 1;
    if (context_data_position === 5) {
      context_data += URI_KEY.charAt(context_data_val);
      break;
    } else {
      context_data_position++;
    }
  }

  return context_data;
}

export function lzDecompress(compressed: string | null): string {
  if (compressed === null || compressed === '') return '';
  const dictionary: string[] = [0, 1, 2].map((i) => String(i));
  let next: number;
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  let result = '';
  let w = '';
  let bits = 0;
  let resb: number;
  let maxpower: number;
  let power: number;
  let c = '';
  const data = {
    val: URI_KEY.indexOf(compressed.charAt(0)),
    position: 32,
    index: 1,
  };

  for (let i = 0; i < 3; i++) {
    dictionary[i] = String(i);
  }

  bits = 0;
  maxpower = Math.pow(2, 2);
  power = 1;
  while (power !== maxpower) {
    resb = data.val & data.position;
    data.position >>= 1;
    if (data.position === 0) {
      data.position = 32;
      data.val = URI_KEY.indexOf(compressed.charAt(data.index++));
    }
    bits |= (resb > 0 ? 1 : 0) * power;
    power <<= 1;
  }

  next = bits;
  switch (next) {
    case 0:
      bits = 0;
      maxpower = Math.pow(2, 8);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = 32;
          data.val = URI_KEY.indexOf(compressed.charAt(data.index++));
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = String.fromCharCode(bits);
      break;
    case 1:
      bits = 0;
      maxpower = Math.pow(2, 16);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = 32;
          data.val = URI_KEY.indexOf(compressed.charAt(data.index++));
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = String.fromCharCode(bits);
      break;
    case 2:
      return '';
  }

  dictionary[3] = c;
  w = c;
  result += c;

  while (true) {
    if (data.index > compressed.length) {
      return '';
    }

    bits = 0;
    maxpower = Math.pow(2, numBits);
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = 32;
        data.val = URI_KEY.indexOf(compressed.charAt(data.index++));
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch ((next = bits)) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32;
            data.val = URI_KEY.indexOf(compressed.charAt(data.index++));
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        next = dictSize - 1;
        enlargeIn--;
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = 32;
            data.val = URI_KEY.indexOf(compressed.charAt(data.index++));
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        next = dictSize - 1;
        enlargeIn--;
        break;
      case 2:
        return result;
    }

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    if (dictionary[next]) {
      entry = dictionary[next]!;
    } else {
      if (next === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return '';
      }
    }
    result += entry;

    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;
    w = entry;

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }
  }
}

export function compressCodeToHash(code: string): string {
  try {
    return lzCompress(code);
  } catch {
    return '';
  }
}

export function decompressCodeFromHash(hash: string): string {
  if (!hash) return '';
  try {
    const lzResult = lzDecompress(hash);
    if (lzResult) return lzResult;

    // Fallback for legacy Base64
    let b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const decoded = atob(b64);
    return decodeURIComponent(decoded);
  } catch {
    return '';
  }
}

export function extractCodeFromUrl(url: string): string | null {
  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;

    const hashStr = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hashStr);
    const codeHash = params.get('code');

    if (!codeHash) return null;
    const decompressed = decompressCodeFromHash(codeHash);
    return decompressed || null;
  } catch {
    return null;
  }
}

export function isHashSafeLength(hash: string): boolean {
  return hash.length <= 2000;
}
