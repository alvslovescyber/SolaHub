export function isTokenExpired(token: string | null): boolean {
  const payload = readJwtPayload(token)
  return typeof payload?.exp !== 'number' || payload.exp * 1000 < Date.now()
}

export function hasUsableAccessToken(token: string | null): boolean {
  return !!token && !isTokenExpired(token)
}

function readJwtPayload(token: string | null): { exp?: unknown } | null {
  if (!token) return null

  try {
    const payloadSegment = token.split('.')[1]
    if (!payloadSegment) return null
    return JSON.parse(decodeBase64Url(payloadSegment)) as { exp?: unknown }
  } catch {
    return null
  }
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(padded)
}
