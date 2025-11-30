import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFavoriteBars(ctx.user.id);
    }),
    add: protectedProcedure
      .input(z.object({
        placeId: z.string(),
        name: z.string(),
        address: z.string().optional(),
        latitude: z.string(),
        longitude: z.string(),
        rating: z.string().optional(),
        priceLevel: z.number().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.addFavoriteBar({
          userId: ctx.user.id,
          ...input,
        });
      }),
    remove: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.removeFavoriteBar(input.id, ctx.user.id);
      }),
    check: protectedProcedure
      .input(z.object({
        placeId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.isFavoriteBar(input.placeId, ctx.user.id);
      }),
  }),

  verifications: router({
    add: protectedProcedure
      .input(z.object({
        placeId: z.string(),
        hasPinaColada: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.addBarVerification({
          placeId: input.placeId,
          userId: ctx.user.id,
          hasPinaColada: input.hasPinaColada ? 1 : 0,
        });
      }),
    stats: publicProcedure
      .input(z.object({
        placeId: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getBarVerificationStats(input.placeId);
      }),
    userVerification: protectedProcedure
      .input(z.object({
        placeId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getUserVerification(input.placeId, ctx.user.id);
      }),
  }),

  reviews: router({
    add: protectedProcedure
      .input(z.object({
        placeId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const { addReview } = await import("./db");
        await addReview({
          userId: ctx.user.id,
          placeId: input.placeId,
          rating: input.rating,
          comment: input.comment,
        });
        return { success: true };
      }),

    list: publicProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ input }) => {
        const { getReviewsByPlaceId } = await import("./db");
        return await getReviewsByPlaceId(input.placeId);
      }),

    delete: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteReview } = await import("./db");
        await deleteReview(input.reviewId, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
