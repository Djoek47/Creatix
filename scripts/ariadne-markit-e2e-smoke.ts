import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { MarkitCreatixAriadneClient } from '@/lib/markit/creatix-ariadne-client'

async function run() {
  const baseUrl = process.env.ARIADNE_E2E_BASE_URL
  const contentId = process.env.ARIADNE_E2E_CONTENT_ID
  const recipientKey = process.env.ARIADNE_E2E_RECIPIENT_KEY || 'markit-e2e-recipient'
  const detectFile = process.env.ARIADNE_E2E_DETECT_FILE

  if (!baseUrl || !contentId || !detectFile) {
    console.log(
      'Set ARIADNE_E2E_BASE_URL, ARIADNE_E2E_CONTENT_ID, and ARIADNE_E2E_DETECT_FILE to run the smoke test.',
    )
    return
  }

  const client = new MarkitCreatixAriadneClient({ baseUrl })

  const embed = (await client.embed({
    contentId,
    recipientKey,
    source: 'frame_export',
    lineage: {
      jobId: `markit-smoke-${Date.now()}`,
      pipelineVersion: 'markit-e2e-smoke',
      encoderProfile: 'h264-main',
    },
    updateContentRow: false,
  })) as {
    exportId: string
    payloadId: string
    success: boolean
  }
  assert.equal(embed.success, true)
  assert.ok(embed.exportId)
  assert.ok(embed.payloadId)

  const list = (await client.listExports()) as { exports: Array<{ id: string }> }
  assert.ok(Array.isArray(list.exports))
  assert.ok(list.exports.some((row) => row.id === embed.exportId))

  const file = new Blob([await readFile(detectFile)], { type: 'video/mp4' })
  const detect = (await client.detect({
    file,
    suspectedExportId: embed.exportId,
    contentId,
  })) as { match: boolean | 'unregistered' }
  assert.ok(detect.match === true || detect.match === 'unregistered' || detect.match === false)

  const evidence = (await client.getEvidence(embed.exportId)) as {
    evidence: { export: { id: string } }
  }
  assert.equal(evidence.evidence.export.id, embed.exportId)

  console.log('ariadne-markit-e2e-smoke.ts: smoke assertions passed')
}

run().catch((error) => {
  console.error('ariadne-markit-e2e-smoke.ts failed', error)
  process.exit(1)
})

