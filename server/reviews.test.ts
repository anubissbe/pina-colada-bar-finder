import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("reviews router", () => {
  const testPlaceId = "test-place-123";

  it("should add a review", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reviews.add({
      placeId: testPlaceId,
      rating: 5,
      comment: "Best piña colada ever!",
    });

    expect(result).toEqual({ success: true });
  });

  it("should list reviews for a place", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Add a review first
    await caller.reviews.add({
      placeId: testPlaceId,
      rating: 4,
      comment: "Pretty good piña colada",
    });

    const reviews = await caller.reviews.list({ placeId: testPlaceId });

    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0]).toHaveProperty("rating");
    expect(reviews[0]).toHaveProperty("comment");
    expect(reviews[0]).toHaveProperty("userName");
  });

  it("should delete a review", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    // Add a review
    await caller.reviews.add({
      placeId: testPlaceId,
      rating: 3,
      comment: "Average piña colada",
    });

    // Get the review
    const reviews = await caller.reviews.list({ placeId: testPlaceId });
    const userReview = reviews.find((r) => r.userId === 2);

    expect(userReview).toBeDefined();

    if (userReview) {
      // Delete the review
      const result = await caller.reviews.delete({ reviewId: userReview.id });
      expect(result).toEqual({ success: true });
    }
  });
});

describe("review database helpers", () => {
  const testPlaceId = "test-place-db-456";

  it("should add review to database", async () => {
    const result = await db.addReview({
      userId: 1,
      placeId: testPlaceId,
      rating: 5,
      comment: "Excellent piña colada!",
    });

    expect(result).toBeDefined();
  });

  it("should get reviews by place ID", async () => {
    // Add a review first
    await db.addReview({
      userId: 1,
      placeId: testPlaceId,
      rating: 4,
      comment: "Great piña colada",
    });

    const reviews = await db.getReviewsByPlaceId(testPlaceId);

    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0]).toHaveProperty("rating");
    expect(reviews[0]).toHaveProperty("comment");
  });

  it("should delete review from database", async () => {
    // Add a review
    await db.addReview({
      userId: 3,
      placeId: testPlaceId,
      rating: 2,
      comment: "Not great",
    });

    const reviews = await db.getReviewsByPlaceId(testPlaceId);
    const review = reviews.find((r) => r.userId === 3);

    expect(review).toBeDefined();

    if (review) {
      const result = await db.deleteReview(review.id, 3);
      expect(result).toBeDefined();
    }
  });
});
