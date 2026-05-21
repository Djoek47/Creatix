import { spawn } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { embedWatermark, type GrayFrame, type WatermarkEmbeddingPlan } from '@/lib/ariadne/watermark-engine'

type VideoProbe = {
  width: number
  height: number
  fps: number
}

type EmbedVideoResult = {
  output: Buffer
  frameCount: number
  embeddedWindows: number
  sizeDeltaBytes: number
}

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe'

function runBin(bin: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, windowsHide: true })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (d) => out.push(Buffer.from(d)))
    child.stderr.on('data', (d) => err.push(Buffer.from(d)))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString('utf8'))
      else reject(new Error(`${bin} exited ${code}: ${Buffer.concat(err).toString('utf8').slice(0, 1200)}`))
    })
  })
}

function parseFps(raw: string | undefined): number {
  if (!raw) return 30
  const [nRaw, dRaw] = raw.split('/')
  const n = Number(nRaw)
  const d = Number(dRaw || 1)
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 30
  const fps = n / d
  return fps > 0 && fps < 240 ? fps : 30
}

async function probeVideo(path: string): Promise<VideoProbe> {
  const json = await runBin(FFPROBE, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,r_frame_rate',
    '-of',
    'json',
    path,
  ])
  const parsed = JSON.parse(json) as { streams?: Array<{ width?: number; height?: number; r_frame_rate?: string }> }
  const stream = parsed.streams?.[0]
  if (!stream?.width || !stream?.height) throw new Error('No video stream found')
  return {
    width: stream.width,
    height: stream.height,
    fps: parseFps(stream.r_frame_rate),
  }
}

function rawFrameToGray(raw: Buffer, offset: number, width: number, height: number): GrayFrame {
  const frame: GrayFrame = []
  for (let y = 0; y < height; y++) {
    const row: number[] = []
    const rowOffset = offset + y * width * 3
    for (let x = 0; x < width; x++) row.push(raw[rowOffset + x * 3] ?? 0)
    frame.push(row)
  }
  return frame
}

function applyGrayDeltaToRaw(raw: Buffer, offset: number, width: number, height: number, before: GrayFrame, after: GrayFrame) {
  for (let y = 0; y < height; y++) {
    const rowOffset = offset + y * width * 3
    for (let x = 0; x < width; x++) {
      const delta = (after[y]?.[x] ?? 0) - (before[y]?.[x] ?? 0)
      if (delta === 0) continue
      const p = rowOffset + x * 3
      raw[p] = Math.max(0, Math.min(255, (raw[p] ?? 0) + delta))
      raw[p + 1] = Math.max(0, Math.min(255, (raw[p + 1] ?? 0) + delta))
      raw[p + 2] = Math.max(0, Math.min(255, (raw[p + 2] ?? 0) + delta))
    }
  }
}

export async function embedFrameV2IntoMp4(input: Buffer, plan: WatermarkEmbeddingPlan): Promise<EmbedVideoResult> {
  const dir = await mkdtemp(join(tmpdir(), 'ariadne-v2-'))
  try {
    const inPath = join(dir, 'input.mp4')
    const rawPath = join(dir, 'frames.rgb')
    const watermarkedRawPath = join(dir, 'frames-watermarked.rgb')
    const outPath = join(dir, 'embedded.mp4')
    await writeFile(inPath, input)
    const probe = await probeVideo(inPath)
    await runBin(FFMPEG, ['-y', '-i', inPath, '-map', '0:v:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', rawPath])
    const raw = await readFile(rawPath)
    const frameSize = probe.width * probe.height * 3
    const frameCount = Math.floor(raw.length / frameSize)
    if (frameCount <= 0) throw new Error('No frames extracted from input MP4')

    let embeddedWindows = 0
    for (let i = 0; i < frameCount; i++) {
      const offset = i * frameSize
      const before = rawFrameToGray(raw, offset, probe.width, probe.height)
      const after = embedWatermark(before, plan.payloadBits, plan.options)
      applyGrayDeltaToRaw(raw, offset, probe.width, probe.height, before, after)
      embeddedWindows += plan.payloadBits.length
    }
    await writeFile(watermarkedRawPath, raw)
    await runBin(FFMPEG, [
      '-y',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-s',
      `${probe.width}x${probe.height}`,
      '-r',
      String(probe.fps),
      '-i',
      watermarkedRawPath,
      '-i',
      inPath,
      '-map',
      '0:v:0',
      '-map',
      '1:a?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'copy',
      '-shortest',
      outPath,
    ])
    const output = await readFile(outPath)
    return {
      output,
      frameCount,
      embeddedWindows,
      sizeDeltaBytes: output.length - input.length,
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function parsePgm(buf: Buffer): GrayFrame {
  const headerEnd = buf.indexOf(Buffer.from('\n255\n'))
  if (headerEnd < 0 || buf.subarray(0, 2).toString('ascii') !== 'P5') throw new Error('Invalid PGM frame')
  const header = buf.subarray(0, headerEnd).toString('ascii').replace(/#[^\n]*/g, '')
  const parts = header.trim().split(/\s+/)
  const width = Number(parts[1])
  const height = Number(parts[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid PGM dimensions')
  }
  const pixels = buf.subarray(headerEnd + 5)
  const frame: GrayFrame = []
  for (let y = 0; y < height; y++) {
    const row: number[] = []
    for (let x = 0; x < width; x++) row.push(pixels[y * width + x] ?? 0)
    frame.push(row)
  }
  return frame
}

export function isLikelyImageBuffer(buf: Buffer): boolean {
  return (
    (buf.length > 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47) ||
    (buf[0] === 0xff && buf[1] === 0xd8)
  )
}

export async function extractDetectionFrames(input: Buffer, maxFrames = 8): Promise<GrayFrame[]> {
  const dir = await mkdtemp(join(tmpdir(), 'ariadne-detect-'))
  try {
    const inputPath = join(dir, isLikelyImageBuffer(input) ? 'input.image' : 'input.mp4')
    await writeFile(inputPath, input)
    if (isLikelyImageBuffer(input)) {
      const framePath = join(dir, 'frame.pgm')
      await runBin(FFMPEG, ['-y', '-i', inputPath, '-frames:v', '1', framePath])
      return [parsePgm(await readFile(framePath))]
    }

    const pattern = join(dir, 'frame-%03d.pgm')
    await runBin(FFMPEG, ['-y', '-i', inputPath, '-vf', 'fps=1', '-frames:v', String(maxFrames), pattern])
    const frames: GrayFrame[] = []
    for (let i = 1; i <= maxFrames; i++) {
      try {
        frames.push(parsePgm(await readFile(join(dir, `frame-${String(i).padStart(3, '0')}.pgm`))))
      } catch {
        break
      }
    }
    return frames
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
