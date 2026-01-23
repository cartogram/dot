/**
 * Dashboard Card Types
 *
 * Defines string literal types and Zod schemas for validation.
 */

import { z } from 'zod'
import type { DashboardCard as PrismaDashboardCard } from '@prisma/client'

// =====================================================
// STRING LITERAL TYPES
// =====================================================

export const CARD_TYPES = ['activity'] as const
export type CardType = (typeof CARD_TYPES)[number]

export const ACTIVITY_TYPES = [
  'Run',
  'Ride',
  'Swim',
  'Hike',
  'Kayaking',
  'NordicSki',
  'Snowboard',
  'Workout',
  'Surfing',
  'AlpineSki',
  'WeightTraining',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const METRICS = ['distance', 'count', 'elevation', 'time'] as const
export type Metric = (typeof METRICS)[number]

export const TIME_FRAMES = ['week', 'month', 'year', 'ytd'] as const
export type TimeFrame = (typeof TIME_FRAMES)[number]

export const CARD_SIZES = ['small', 'medium', 'large'] as const
export type CardSize = (typeof CARD_SIZES)[number]

// =====================================================
// ZOD SCHEMAS
// =====================================================

export const CardTypeSchema = z.enum(CARD_TYPES)
export const ActivityTypeSchema = z.enum(ACTIVITY_TYPES)
export const MetricSchema = z.enum(METRICS)
export const TimeFrameSchema = z.enum(TIME_FRAMES)
export const CardSizeSchema = z.enum(CARD_SIZES)

// =====================================================
// DASHBOARD CARD TYPES
// =====================================================

// The card type as returned from Prisma queries
export type DashboardCard = PrismaDashboardCard

// Typed version with validated enums
export interface TypedDashboardCard extends Omit<PrismaDashboardCard, 'type' | 'activityTypes' | 'metric' | 'timeFrame' | 'size'> {
  type: CardType
  activityTypes: ActivityType[]
  metric: Metric
  timeFrame: TimeFrame
  size: CardSize
}

// Input type for creating a new card (without auto-generated fields)
export const CreateCardInputSchema = z.object({
  type: CardTypeSchema,
  title: z.string().min(1),
  activityTypes: z.array(ActivityTypeSchema).min(1),
  metric: MetricSchema,
  timeFrame: TimeFrameSchema,
  size: CardSizeSchema.optional().default('medium'),
  visible: z.boolean().optional().default(true),
  goal: z.number().nullable().optional(),
})

export type CreateCardInput = z.infer<typeof CreateCardInputSchema>

// Input type for updating a card
export const UpdateCardInputSchema = z.object({
  title: z.string().min(1).optional(),
  activityTypes: z.array(ActivityTypeSchema).min(1).optional(),
  metric: MetricSchema.optional(),
  timeFrame: TimeFrameSchema.optional(),
  size: CardSizeSchema.optional(),
  visible: z.boolean().optional(),
  goal: z.number().nullable().optional(),
  position: z.number().optional(),
})

export type UpdateCardInput = z.infer<typeof UpdateCardInputSchema>

// =====================================================
// DISPLAY HELPERS
// =====================================================

export const METRIC_LABELS: Record<Metric, string> = {
  distance: 'Distance',
  count: 'Count',
  elevation: 'Elevation',
  time: 'Time',
}

export const METRIC_UNITS: Record<Metric, string> = {
  distance: 'km',
  count: 'activities',
  elevation: 'm',
  time: 'hours',
}

export const TIME_FRAME_LABELS: Record<TimeFrame, string> = {
  week: 'Week',
  month: 'Month',
  year: 'Year',
  ytd: 'Year to Date',
}

export const CARD_SIZE_LABELS: Record<CardSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}
