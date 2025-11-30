import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  placeId: varchar("placeId", { length: 255 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment").notNull(),
  photoUrl: varchar("photoUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Favorite bars table - stores user's saved bars that serve piña coladas
 */
export const favoriteBars = mysqlTable("favorite_bars", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  placeId: varchar("place_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  latitude: varchar("latitude", { length: 50 }).notNull(),
  longitude: varchar("longitude", { length: 50 }).notNull(),
  rating: varchar("rating", { length: 10 }),
  priceLevel: int("price_level"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Bar verifications table - tracks user confirmations of piña colada availability
 */
export const barVerifications = mysqlTable("bar_verifications", {
  id: int("id").autoincrement().primaryKey(),
  placeId: varchar("place_id", { length: 255 }).notNull(),
  userId: int("user_id").notNull(),
  hasPinaColada: int("has_pina_colada").notNull(), // 1 for yes, 0 for no
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BarVerification = typeof barVerifications.$inferSelect;
export type InsertBarVerification = typeof barVerifications.$inferInsert;

export type FavoriteBar = typeof favoriteBars.$inferSelect;
export type InsertFavoriteBar = typeof favoriteBars.$inferInsert;