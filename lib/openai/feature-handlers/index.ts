/**
 * OpenAI Responses background completions are handled in `@/lib/openai/webhook-processor`
 * (`handleFeatureCompleted`). Extend `OPENAI_JOB_FEATURES` and add a dispatch branch there when
 * introducing new slugs; enqueue with `createOpenAiBackgroundJob` from `background-jobs.ts`.
 */

export {}
