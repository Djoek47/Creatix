function envBool(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export function isMarkitAriadneServiceModeEnabled(): boolean {
  return envBool(process.env.MARKIT_ARIADNE_SERVICE_MODE, false)
}

export function isAriadneServiceAuthEnforced(): boolean {
  return envBool(process.env.ARIADNE_SERVICE_AUTH_ENFORCED, false)
}

export function isAriadneDetectConfidenceGatingEnabled(): boolean {
  return envBool(process.env.ARIADNE_DETECT_CONFIDENCE_GATING, false)
}

export function isAriadneV2EmbedEnabled(): boolean {
  return envBool(process.env.ARIADNE_V2_EMBED_ENABLED, false)
}

export function isAriadneV2DetectEnabled(): boolean {
  return envBool(process.env.ARIADNE_V2_DETECT_ENABLED, false)
}

export function isAriadneConfidenceGatingEnabled(): boolean {
  return envBool(
    process.env.ARIADNE_CONFIDENCE_GATING_ENABLED,
    envBool(process.env.ARIADNE_DETECT_CONFIDENCE_GATING, false),
  )
}

export function isFramerTracedExportEnabled(): boolean {
  return envBool(process.env.FRAMER_TRACED_EXPORT_ENABLED, false)
}

/** Extra V4 request/response fields in logs (internal staging). */
export function isAriadneM2MDebugLoggingEnabled(): boolean {
  return envBool(process.env.ARIADNE_M2M_DEBUG_LOG, false)
}

/** Enables POST /api/ariadne/test/run (harness, no production traffic). */
export function isAriadneAttributionTestApiEnabled(): boolean {
  return envBool(process.env.ARIADNE_ATTRIBUTION_TEST_API, false)
}

/** When true, progressive leak scan runs ffmpeg to decode real video frames (requires FFMPEG_PATH or `ffmpeg` on PATH). */
export function isAriadneFfmpegLeakScanEnabled(): boolean {
  return envBool(process.env.ARIADNE_FFMPEG_LEAK_SCAN, false)
}

