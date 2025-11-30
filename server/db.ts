import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, favoriteBars, InsertFavoriteBar, barVerifications, InsertBarVerification, reviews, InsertReview } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Favorite bars queries
export async function getUserFavoriteBars(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get favorite bars: database not available");
    return [];
  }

  const result = await db.select().from(favoriteBars).where(eq(favoriteBars.userId, userId));
  return result;
}

export async function addFavoriteBar(bar: InsertFavoriteBar) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add favorite bar: database not available");
    return null;
  }

  const result = await db.insert(favoriteBars).values(bar);
  return result;
}

export async function removeFavoriteBar(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot remove favorite bar: database not available");
    return null;
  }

  const result = await db.delete(favoriteBars).where(
    and(eq(favoriteBars.id, id), eq(favoriteBars.userId, userId))
  );
  return result;
}

export async function isFavoriteBar(placeId: string, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check favorite bar: database not available");
    return false;
  }

  const result = await db.select().from(favoriteBars)
    .where(and(eq(favoriteBars.placeId, placeId), eq(favoriteBars.userId, userId)))
    .limit(1);
  return result.length > 0;
}

// Bar verification queries
export async function addBarVerification(verification: InsertBarVerification) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add verification: database not available");
    return null;
  }

  // Check if user already verified this bar
  const existing = await db.select().from(barVerifications)
    .where(and(eq(barVerifications.placeId, verification.placeId), eq(barVerifications.userId, verification.userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing verification
    await db.update(barVerifications)
      .set({ hasPinaColada: verification.hasPinaColada, createdAt: new Date() })
      .where(eq(barVerifications.id, existing[0].id));
    return existing[0];
  }

  const result = await db.insert(barVerifications).values(verification);
  return result;
}

export async function getBarVerificationStats(placeId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get verification stats: database not available");
    return { verified: 0, unverified: 0, total: 0 };
  }

  const results = await db.select({
    hasPinaColada: barVerifications.hasPinaColada,
    count: sql<number>`count(*)`
  })
  .from(barVerifications)
  .where(eq(barVerifications.placeId, placeId))
  .groupBy(barVerifications.hasPinaColada);

  let verified = 0;
  let unverified = 0;

  results.forEach((row) => {
    if (row.hasPinaColada === 1) {
      verified = Number(row.count);
    } else {
      unverified = Number(row.count);
    }
  });

  return {
    verified,
    unverified,
    total: verified + unverified,
  };
}

export async function getUserVerification(placeId: string, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user verification: database not available");
    return null;
  }

  const result = await db.select().from(barVerifications)
    .where(and(eq(barVerifications.placeId, placeId), eq(barVerifications.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Review helpers
export async function addReview(review: InsertReview) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add review: database not available");
    return null;
  }

  const result = await db.insert(reviews).values(review);
  return result;
}

export async function getReviewsByPlaceId(placeId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get reviews: database not available");
    return [];
  }

  const result = await db
    .select({
      id: reviews.id,
      userId: reviews.userId,
      placeId: reviews.placeId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      userName: users.name,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.placeId, placeId))
    .orderBy(desc(reviews.createdAt));

  return result;
}

export async function deleteReview(reviewId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete review: database not available");
    return null;
  }

  const result = await db
    .delete(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)));

  return result;
}

export async function getAverageRating(placeId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get average rating: database not available");
    return null;
  }

  const result = await db
    .select({
      avgRating: sql<number>`AVG(${reviews.rating})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(eq(reviews.placeId, placeId));

  if (result.length === 0 || result[0].count === 0) {
    return null;
  }

  return {
    average: Number(result[0].avgRating),
    count: Number(result[0].count),
  };
}
