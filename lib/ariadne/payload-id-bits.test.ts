import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { bitsToUuidWithDashes, normalizePayloadIdHex, uuidHexToBits } from '@/lib/ariadne/payload-id-bits'

function run() {
  const id = randomUUID()
  const bits = uuidHexToBits(id.replace(/-/g, ''))
  assert.equal(bits.length, 128)
  const back = bitsToUuidWithDashes(bits)
  assert.equal(back, id)
  assert.equal(normalizePayloadIdHex('not-hex')?.length ?? 0, 0)
  console.log('payload-id-bits.test.ts: all assertions passed')
}

run()
