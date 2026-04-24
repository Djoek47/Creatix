import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SESSION_COOKIE = __ENV.SESSION_COOKIE || ''
const SAMPLE_FAN_ID = __ENV.SAMPLE_FAN_ID || '1'

export const options = {
  scenarios: {
    inbox_churn: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '5m', target: 200 },
        { duration: '5m', target: 400 },
        { duration: '10m', target: 1000 },
        { duration: '30m', target: 1000 },
        { duration: '5m', target: 1250 },
        { duration: '5m', target: 200 },
      ],
      exec: 'inboxFlow',
    },
    thread_refresh: {
      executor: 'constant-vus',
      vus: 350,
      duration: '55m',
      exec: 'threadFlow',
    },
    mass_message_bursts: {
      executor: 'constant-arrival-rate',
      rate: 6,
      timeUnit: '1m',
      duration: '55m',
      preAllocatedVUs: 20,
      maxVUs: 80,
      exec: 'massMessageFlow',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<2000', 'p(99)<4500'],
  },
}

function authHeaders() {
  return {
    headers: {
      Cookie: SESSION_COOKIE,
      'Content-Type': 'application/json',
    },
  }
}

export function inboxFlow() {
  const url = `${BASE_URL}/api/messages/inbox?platform=all&segment=all&sort=recent&limit=40`
  const res = http.get(url, authHeaders())
  check(res, {
    'inbox status ok': (r) => r.status === 200 || r.status === 429,
  })
  sleep(Math.random() * 3 + 2)
}

export function threadFlow() {
  const refresh = Math.random() < 0.2 ? '&refresh=1' : ''
  const url = `${BASE_URL}/api/onlyfans/messages/${encodeURIComponent(SAMPLE_FAN_ID)}?limit=100${refresh}`
  const res = http.get(url, authHeaders())
  check(res, {
    'thread status ok': (r) => r.status === 200 || r.status === 429,
  })
  sleep(Math.random() * 2 + 1)
}

export function massMessageFlow() {
  const body = JSON.stringify({
    message: `Load test broadcast ${Date.now()}`,
    platforms: ['onlyfans'],
    userIds: [SAMPLE_FAN_ID],
  })
  const res = http.post(`${BASE_URL}/api/messages/mass`, body, authHeaders())
  check(res, {
    'mass status ok': (r) => r.status === 200 || r.status === 429,
  })
  sleep(Math.random() * 2 + 1)
}
