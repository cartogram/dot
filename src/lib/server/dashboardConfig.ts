/**
 * Server functions for dashboard card configuration
 *
 * Handles dashboard card CRUD operations using Prisma DashboardCard table.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import {
  CardTypeSchema,
  ActivityTypeSchema,
  MetricSchema,
  TimeFrameSchema,
  CardSizeSchema,
} from '@/types/dashboard'
import type { DashboardCard } from '@/types/dashboard'

// =====================================================
// SCHEMAS
// =====================================================

const DashboardIdSchema = z.object({
  dashboardId: z.string().uuid(),
})

const AddCardSchema = z.object({
  dashboardId: z.string().uuid(),
  card: z.object({
    type: CardTypeSchema,
    title: z.string().min(1),
    activityTypes: z.array(ActivityTypeSchema).min(1),
    metric: MetricSchema,
    timeFrame: TimeFrameSchema,
    size: CardSizeSchema.optional(),
    visible: z.boolean().optional(),
    goal: z.number().nullable().optional(),
  }),
})

const UpdateCardSchema = z.object({
  cardId: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).optional(),
    activityTypes: z.array(ActivityTypeSchema).min(1).optional(),
    metric: MetricSchema.optional(),
    timeFrame: TimeFrameSchema.optional(),
    size: CardSizeSchema.optional(),
    visible: z.boolean().optional(),
    goal: z.number().nullable().optional(),
    position: z.number().optional(),
  }),
})

const DeleteCardSchema = z.object({
  cardId: z.string().uuid(),
})

const UserIdSchema = z.object({
  userId: z.string().uuid(),
})

// =====================================================
// HELPER: Get or create default dashboard
// =====================================================

async function getOrCreateDefaultDashboard(userId: string): Promise<string> {
  // Try to find existing default dashboard
  const existing = await prisma.dashboard.findFirst({
    where: {
      ownerId: userId,
      isDefault: true,
    },
    select: { id: true },
  })

  if (existing) {
    return existing.id
  }

  // Create a default dashboard for the user
  const newDashboard = await prisma.dashboard.create({
    data: {
      name: 'My Dashboard',
      ownerId: userId,
      isDefault: true,
      profiles: {
        create: {
          profileId: userId,
          role: 'owner',
          inviteAccepted: true,
        },
      },
    },
    select: { id: true },
  })

  return newDashboard.id
}

// =====================================================
// GET DASHBOARD CARDS
// =====================================================

export const getDashboardCards = createServerFn({ method: 'GET' })
  .inputValidator(DashboardIdSchema)
  .handler(async ({ data }): Promise<DashboardCard[]> => {
    const cards = await prisma.dashboardCard.findMany({
      where: { dashboardId: data.dashboardId },
      orderBy: { position: 'asc' },
    })
    return cards
  })

// =====================================================
// GET VISIBLE CARDS
// =====================================================

export const getVisibleCards = createServerFn({ method: 'GET' })
  .inputValidator(DashboardIdSchema)
  .handler(async ({ data }): Promise<DashboardCard[]> => {
    const cards = await prisma.dashboardCard.findMany({
      where: {
        dashboardId: data.dashboardId,
        visible: true,
      },
      orderBy: { position: 'asc' },
    })
    return cards
  })

// =====================================================
// ADD DASHBOARD CARD
// =====================================================

export const addDashboardCard = createServerFn({ method: 'POST' })
  .inputValidator(AddCardSchema)
  .handler(async ({ data }): Promise<DashboardCard> => {
    // Get the max position for this dashboard
    const maxPositionResult = await prisma.dashboardCard.aggregate({
      where: { dashboardId: data.dashboardId },
      _max: { position: true },
    })
    const nextPosition = (maxPositionResult._max.position ?? -1) + 1

    const card = await prisma.dashboardCard.create({
      data: {
        dashboardId: data.dashboardId,
        type: data.card.type,
        title: data.card.title,
        activityTypes: data.card.activityTypes,
        metric: data.card.metric,
        timeFrame: data.card.timeFrame,
        size: data.card.size ?? 'medium',
        visible: data.card.visible ?? true,
        goal: data.card.goal ?? null,
        position: nextPosition,
      },
    })

    return card
  })

// =====================================================
// UPDATE DASHBOARD CARD
// =====================================================

export const updateDashboardCard = createServerFn({ method: 'POST' })
  .inputValidator(UpdateCardSchema)
  .handler(async ({ data }): Promise<DashboardCard> => {
    const card = await prisma.dashboardCard.update({
      where: { id: data.cardId },
      data: data.updates,
    })
    return card
  })

// =====================================================
// DELETE DASHBOARD CARD
// =====================================================

export const deleteDashboardCard = createServerFn({ method: 'POST' })
  .inputValidator(DeleteCardSchema)
  .handler(async ({ data }): Promise<void> => {
    await prisma.dashboardCard.delete({
      where: { id: data.cardId },
    })
  })

// =====================================================
// Get default dashboard ID for user
// =====================================================

export const getDefaultDashboardId = createServerFn({ method: 'GET' })
  .inputValidator(UserIdSchema)
  .handler(async ({ data }): Promise<string> => {
    return getOrCreateDefaultDashboard(data.userId)
  })

// =====================================================
// Get visible cards for user's default dashboard (with dashboard ID)
// =====================================================

export const getVisibleCardsForUser = createServerFn({ method: 'GET' })
  .inputValidator(UserIdSchema)
  .handler(
    async ({ data }): Promise<{ dashboardId: string; cards: DashboardCard[] }> => {
      const dashboardId = await getOrCreateDefaultDashboard(data.userId)
      const cards = await prisma.dashboardCard.findMany({
        where: {
          dashboardId,
          visible: true,
        },
        orderBy: { position: 'asc' },
      })
      return { dashboardId, cards }
    },
  )

// =====================================================
// CLEAR ALL CARDS (for dashboard reset)
// =====================================================

export const clearDashboardCards = createServerFn({ method: 'POST' })
  .inputValidator(DashboardIdSchema)
  .handler(async ({ data }): Promise<void> => {
    await prisma.dashboardCard.deleteMany({
      where: { dashboardId: data.dashboardId },
    })
  })
