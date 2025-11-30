import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("verifications router", () => {
  it("should add a verification that bar has piña colada", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.verifications.add({
      placeId: "test-place-verify-1",
      hasPinaColada: true,
    });

    expect(result).toBeDefined();
  });

  it("should add a verification that bar does not have piña colada", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.verifications.add({
      placeId: "test-place-verify-2",
      hasPinaColada: false,
    });

    expect(result).toBeDefined();
  });

  it("should get verification stats for a place", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Add some verifications first
    await caller.verifications.add({
      placeId: "test-place-stats",
      hasPinaColada: true,
    });

    const ctx2 = createAuthContext(2);
    const caller2 = appRouter.createCaller(ctx2);
    await caller2.verifications.add({
      placeId: "test-place-stats",
      hasPinaColada: true,
    });

    const ctx3 = createAuthContext(3);
    const caller3 = appRouter.createCaller(ctx3);
    await caller3.verifications.add({
      placeId: "test-place-stats",
      hasPinaColada: false,
    });

    // Get stats
    const stats = await caller.verifications.stats({ placeId: "test-place-stats" });

    expect(stats).toBeDefined();
    expect(stats.total).toBeGreaterThanOrEqual(3);
    expect(stats.verified).toBeGreaterThanOrEqual(2);
    expect(stats.unverified).toBeGreaterThanOrEqual(1);
  });

  it("should get user's verification for a place", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Add verification
    await caller.verifications.add({
      placeId: "test-place-user-verify",
      hasPinaColada: true,
    });

    // Get user's verification
    const userVerification = await caller.verifications.userVerification({
      placeId: "test-place-user-verify",
    });

    expect(userVerification).toBeDefined();
    expect(userVerification?.hasPinaColada).toBe(1);
  });

  it("should update existing verification when user votes again", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First vote: yes
    await caller.verifications.add({
      placeId: "test-place-update",
      hasPinaColada: true,
    });

    // Second vote: no (should update)
    await caller.verifications.add({
      placeId: "test-place-update",
      hasPinaColada: false,
    });

    // Check that the verification was updated
    const userVerification = await caller.verifications.userVerification({
      placeId: "test-place-update",
    });

    expect(userVerification).toBeDefined();
    expect(userVerification?.hasPinaColada).toBe(0);
  });
});

describe("verification database helpers", () => {
  it("should add bar verification to database", async () => {
    const result = await db.addBarVerification({
      placeId: "db-test-verify-1",
      userId: 1,
      hasPinaColada: 1,
    });

    expect(result).toBeDefined();
  });

  it("should get verification stats", async () => {
    // Add some verifications
    await db.addBarVerification({
      placeId: "db-test-stats",
      userId: 1,
      hasPinaColada: 1,
    });

    await db.addBarVerification({
      placeId: "db-test-stats",
      userId: 2,
      hasPinaColada: 1,
    });

    await db.addBarVerification({
      placeId: "db-test-stats",
      userId: 3,
      hasPinaColada: 0,
    });

    const stats = await db.getBarVerificationStats("db-test-stats");

    expect(stats).toBeDefined();
    expect(stats.total).toBeGreaterThanOrEqual(3);
    expect(stats.verified).toBeGreaterThanOrEqual(2);
    expect(stats.unverified).toBeGreaterThanOrEqual(1);
  });

  it("should get user verification", async () => {
    await db.addBarVerification({
      placeId: "db-test-user-verify",
      userId: 1,
      hasPinaColada: 1,
    });

    const verification = await db.getUserVerification("db-test-user-verify", 1);

    expect(verification).toBeDefined();
    expect(verification?.hasPinaColada).toBe(1);
  });
});
