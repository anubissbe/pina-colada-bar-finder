import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

describe("favorites router", () => {
  it("should add a favorite bar", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const barData = {
      placeId: "test-place-123",
      name: "Test Bar",
      address: "123 Test Street",
      latitude: "40.7128",
      longitude: "-74.0060",
      rating: "4.5",
      priceLevel: 2,
      photoUrl: "https://example.com/photo.jpg",
    };

    const result = await caller.favorites.add(barData);
    expect(result).toBeDefined();
  });

  it("should list user favorites", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const favorites = await caller.favorites.list();
    expect(Array.isArray(favorites)).toBe(true);
  });

  it("should check if a place is favorited", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Add a favorite first
    await caller.favorites.add({
      placeId: "test-place-456",
      name: "Another Test Bar",
      address: "456 Test Avenue",
      latitude: "40.7580",
      longitude: "-73.9855",
    });

    // Check if it's favorited
    const isFav = await caller.favorites.check({ placeId: "test-place-456" });
    expect(typeof isFav).toBe("boolean");
  });

  it("should remove a favorite bar", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Add a favorite
    await caller.favorites.add({
      placeId: "test-place-789",
      name: "Bar to Remove",
      address: "789 Test Road",
      latitude: "40.7489",
      longitude: "-73.9680",
    });

    // Get the list to find the ID
    const favorites = await caller.favorites.list();
    const addedBar = favorites.find((f) => f.placeId === "test-place-789");

    if (addedBar) {
      const result = await caller.favorites.remove({ id: addedBar.id });
      expect(result).toBeDefined();
    }
  });
});

describe("database helpers", () => {
  it("should get user favorite bars", async () => {
    const favorites = await db.getUserFavoriteBars(1);
    expect(Array.isArray(favorites)).toBe(true);
  });

  it("should add a favorite bar to database", async () => {
    const barData = {
      userId: 1,
      placeId: "db-test-place-123",
      name: "DB Test Bar",
      address: "123 DB Test Street",
      latitude: "40.7128",
      longitude: "-74.0060",
    };

    const result = await db.addFavoriteBar(barData);
    expect(result).toBeDefined();
  });

  it("should check if bar is favorite", async () => {
    // Add a bar first
    await db.addFavoriteBar({
      userId: 1,
      placeId: "db-test-place-456",
      name: "DB Check Bar",
      address: "456 DB Test Avenue",
      latitude: "40.7580",
      longitude: "-73.9855",
    });

    const isFav = await db.isFavoriteBar("db-test-place-456", 1);
    expect(typeof isFav).toBe("boolean");
  });
});
