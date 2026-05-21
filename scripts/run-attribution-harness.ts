import { runAttributionTestSuite } from '@/lib/ariadne/attribution-test-harness'

const uid = process.env.HARNESS_USER_ID || '11111111-1111-4111-8111-111111111111'
const r = runAttributionTestSuite(uid)
console.log(JSON.stringify(r, null, 2))
process.exit(r.failed > 0 ? 1 : 0)
