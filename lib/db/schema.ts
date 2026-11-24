import { bigint, boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  nomorWhatsApp: text("nomor_whatsapp").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const toppings = pgTable("toppings", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  emoji: text("emoji").notNull().default(""),
  foto: text("foto"),
  fotoVersion: bigint("foto_version", { mode: "number" }).notNull().default(0),
  harga: integer("harga").notNull().default(0),
  stok: integer("stok").notNull().default(0),
  tersedia: boolean("tersedia").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

