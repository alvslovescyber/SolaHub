import { afterEach, describe, expect, it } from 'vitest'
import {
  clearUpdateReturnRoute,
  consumeUpdateReturnRoute,
  rememberUpdateReturnRoute,
} from '@/lib/appUpdate'

const UPDATE_RETURN_ROUTE_KEY = 'solahub:update-return-route'

afterEach(() => {
  localStorage.clear()
})

describe('appUpdate route persistence', () => {
  it('remembers and consumes a safe app route once', () => {
    rememberUpdateReturnRoute('/presenter?tab=songs')

    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBe('/presenter?tab=songs')
    expect(consumeUpdateReturnRoute()).toBe('/presenter?tab=songs')
    expect(consumeUpdateReturnRoute()).toBeNull()
  })

  it('ignores routes that should not be restored after an update restart', () => {
    rememberUpdateReturnRoute('//evil.example')
    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBeNull()

    rememberUpdateReturnRoute('/presenter-display')
    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBeNull()

    localStorage.setItem(UPDATE_RETURN_ROUTE_KEY, '/presenter-display?screen=2')
    expect(consumeUpdateReturnRoute()).toBeNull()
    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBeNull()
  })

  it('can clear a remembered route explicitly', () => {
    rememberUpdateReturnRoute('/settings')

    clearUpdateReturnRoute()

    expect(localStorage.getItem(UPDATE_RETURN_ROUTE_KEY)).toBeNull()
  })
})
