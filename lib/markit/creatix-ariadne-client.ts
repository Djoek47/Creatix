import { randomUUID } from 'crypto'
import {
  ARIADNE_CONTRACT_VERSION,
  buildServiceSigningMessage,
  sha256Hex,
  signServiceMessage,
} from '@/lib/ariadne/service-auth'

type AriadneSource = 'vault_standalone' | 'frame_export' | 'message_send' | 'mass_dm'

export type MarkitEmbedRequest = {
  contentId: string
  recipientKey: string
  source: AriadneSource
  recipient?: {
    fanId?: string
    platform?: 'onlyfans' | 'fansly' | 'mym'
    platformFanId?: string
    username?: string
    displayName?: string
  }
  origin?: {
    messageId?: string
    massBatchId?: string
  }
  lineage?: {
    jobId?: string
    pipelineVersion?: string
    encoderProfile?: string
  }
  updateContentRow?: boolean
  idempotencyKey?: string
}

export type MarkitDetectRequest = {
  file: Blob
  contentId?: string
  suspectedExportId?: string
  idempotencyKey?: string
}

type AriadneClientConfig = {
  baseUrl: string
  serviceName?: string
}

export class MarkitCreatixAriadneClient {
  private readonly baseUrl: string
  private readonly serviceName: string

  constructor(config: AriadneClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.serviceName = config.serviceName?.trim() || 'markit'
  }

  async embed(input: MarkitEmbedRequest) {
    const path = '/api/ariadne/embed'
    const { idempotencyKey, ...payload } = input
    const body = JSON.stringify(payload)
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.serviceHeaders({
        pathname: path,
        method: 'POST',
        bodySha256: sha256Hex(body),
        json: true,
        idempotencyKey,
      }),
      body,
    })
    return this.readJson(res)
  }

  async detect(input: MarkitDetectRequest) {
    const path = '/api/ariadne/detect'
    const form = new FormData()
    form.set('file', input.file)
    if (input.contentId) form.set('contentId', input.contentId)
    if (input.suspectedExportId) form.set('suspectedExportId', input.suspectedExportId)

    // In browser/node fetch, multipart boundary is set by runtime.
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.serviceHeaders({
        pathname: path,
        method: 'POST',
        bodySha256: '',
        json: false,
        idempotencyKey: input.idempotencyKey,
      }),
      body: form,
    })
    return this.readJson(res)
  }

  async listExports(query?: URLSearchParams) {
    const suffix = query?.toString() ? `?${query.toString()}` : ''
    const res = await fetch(`${this.baseUrl}/api/ariadne/exports${suffix}`, {
      method: 'GET',
    })
    return this.readJson(res)
  }

  async getExport(id: string) {
    const res = await fetch(`${this.baseUrl}/api/ariadne/exports/${id}`, {
      method: 'GET',
    })
    return this.readJson(res)
  }

  async getEvidence(id: string) {
    const res = await fetch(`${this.baseUrl}/api/ariadne/exports/${id}/evidence`, {
      method: 'GET',
    })
    return this.readJson(res)
  }

  private serviceHeaders(input: {
    pathname: string
    method: string
    bodySha256: string
    json: boolean
    idempotencyKey?: string
  }) {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonce = randomUUID()
    const idempotencyKey = input.idempotencyKey?.trim() || `${this.serviceName}:${input.pathname}:${timestamp}:${nonce}`
    const signature = signServiceMessage(
      buildServiceSigningMessage({
        method: input.method,
        pathname: input.pathname,
        timestamp,
        nonce,
        idempotencyKey,
        bodySha256: input.bodySha256,
      }),
    )

    const headers: Record<string, string> = {
      'x-ariadne-contract-version': ARIADNE_CONTRACT_VERSION,
      'x-creatix-service': this.serviceName,
      'x-creatix-timestamp': timestamp,
      'x-creatix-nonce': nonce,
      'x-idempotency-key': idempotencyKey,
      'x-creatix-signature': signature,
    }
    if (input.json) headers['content-type'] = 'application/json'
    return headers
  }

  private async readJson(res: Response): Promise<unknown> {
    let payload: unknown = null
    try {
      payload = await res.json()
    } catch {
      payload = { error: 'Invalid JSON response from Creatix Ariadne API' }
    }
    if (!res.ok) {
      throw new Error(`Ariadne API ${res.status}: ${JSON.stringify(payload)}`)
    }
    return payload
  }
}

