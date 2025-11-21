const adSessions = new Map();
const discountTokens = new Map();

export function rememberAdSessionMeta(sessionId, meta) {
  if (!sessionId) return;
  adSessions.set(sessionId, {
    ...meta,
    recordedAt: Date.now()
  });
}

export function getAdSessionMeta(sessionId) {
  return adSessions.get(sessionId) || null;
}

export function forgetAdSessionMeta(sessionId) {
  if (!sessionId) return;
  adSessions.delete(sessionId);
}

export function rememberDiscountTokenMeta(tokenMeta) {
  if (!tokenMeta?.tokenId) return;
  discountTokens.set(tokenMeta.tokenId, {
    ...tokenMeta,
    recordedAt: Date.now()
  });
}

export function getDiscountTokenMeta(tokenId) {
  const meta = discountTokens.get(tokenId);
  if (!meta) return null;
  if (meta.expiresAt && meta.expiresAt <= Date.now()) {
    discountTokens.delete(tokenId);
    return null;
  }
  return meta;
}

export function forgetDiscountTokenMeta(tokenId) {
  if (!tokenId) return;
  discountTokens.delete(tokenId);
}
