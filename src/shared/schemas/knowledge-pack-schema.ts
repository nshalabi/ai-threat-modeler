import { z } from 'zod'

const severities = ['critical', 'high', 'medium', 'low', 'informational'] as const

export const frameworkReferenceSchema = z.object({
  framework: z.string().min(1),
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url().optional(),
})

export const threatSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(severities),
  frameworkRefs: z.array(frameworkReferenceSchema),
  mitigationIds: z.array(z.string()),
})

export const weaknessSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  relatedThreatIds: z.array(z.string()),
  frameworkRefs: z.array(frameworkReferenceSchema),
})

export const controlSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  frameworkRefs: z.array(frameworkReferenceSchema),
})

export const mitigationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  controlIds: z.array(z.string()),
  frameworkRefs: z.array(frameworkReferenceSchema),
})

export const knowledgePackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  author: z.string().optional(),
  threats: z.array(threatSchema),
  weaknesses: z.array(weaknessSchema),
  controls: z.array(controlSchema),
  mitigations: z.array(mitigationSchema),
})

export type ValidatedKnowledgePack = z.infer<typeof knowledgePackSchema>

export function validateKnowledgePack(input: unknown): ValidatedKnowledgePack | string[] {
  const result = knowledgePackSchema.safeParse(input)
  if (result.success) {
    return result.data
  }
  return result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  )
}
