import { describe, expect, it } from 'vitest'
import { hasUsableAccessToken, isTokenExpired } from '@/lib/authTokens'

describe('authTokens', () => {
  it('accepts a valid JWT payload using base64url encoding', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600, sub: 'user-1' })

    expect(isTokenExpired(token)).toBe(false)
    expect(hasUsableAccessToken(token)).toBe(true)
  })

  it('treats expired tokens as unusable', () => {
    const token = makeToken({ exp: 1 })

    expect(isTokenExpired(token)).toBe(true)
    expect(hasUsableAccessToken(token)).toBe(false)
  })

  it('treats malformed tokens as expired', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true)
    expect(hasUsableAccessToken(null)).toBe(false)
  })

  it('requires a numeric exp claim', () => {
    const token = makeToken({ exp: 'soon' })

    expect(isTokenExpired(token)).toBe(true)
  })
})

function makeToken(payload: Record<string, unknown>): string {
  return ['header', encodeBase64Url(JSON.stringify(payload)), 'signature'].join('.')
}

function encodeBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}
