import assert from 'node:assert'
import { jdFromDateUtc, localSiderealDegrees, raDecToAltAzDeg } from '@/lib/stellar/astronomy'

const known = jdFromDateUtc(new Date(Date.UTC(2000, 0, 1, 12)))

assert.ok(Number.isFinite(known) && known > 2_451_544)

/** Star zenith-ish: HA≈0, δ≈lat ⇒ altitude ≈ 90° without wrap edge cases here */
export function runSmokeTest() {
  const lat = 40
  const ra = 270
  const dec = 40
  const lst = ra
  const h = raDecToAltAzDeg(ra, dec, lat, lst)
  assert.ok(Math.abs(h.altitudeDeg - 90) < 4, `near zenith: got alt ${h.altitudeDeg}`)

  const lst2 = localSiderealDegrees(jdFromDateUtc(new Date(Date.UTC(2023, 2, 20, 0, 0, 0))), -74)
  assert.ok(lst2 >= 0 && lst2 < 360)
}

runSmokeTest()
