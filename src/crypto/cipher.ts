// Custom stream cipher: XorShift64 PRNG seeded by FNV-1a key schedule

const FNV_PRIME = 1099511628211n;
const FNV_OFFSET = 14695981039346656037n;

function fnv1a(data: Uint8Array): bigint {
  let h = FNV_OFFSET;
  for (const b of data) h = BigInt.asUintN(64, (h ^ BigInt(b)) * FNV_PRIME);
  return h || 1n; // prevent zero seed
}

function mkStream(seed: bigint): () => number {
  let s = seed;
  return () => {
    s ^= BigInt.asUintN(64, s << 13n);
    s ^= s >> 7n;
    s ^= BigInt.asUintN(64, s << 17n);
    return Number(s & 0xffn);
  };
}

/** Encrypt or decrypt — XOR is symmetric */
export function cipher(data: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  const combined = new Uint8Array(key.length + nonce.length);
  combined.set(key);
  combined.set(nonce, key.length);
  const next = mkStream(fnv1a(combined));
  return data.map(b => b ^ next());
}
