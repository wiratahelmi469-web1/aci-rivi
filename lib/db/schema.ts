import { bigint, boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { ChatSenderType, OrderTopping } from "@/lib/types";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  nomorWhatsApp: text("nomor_whatsapp").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    senderType: text("sender_type").$type<ChatSenderType>().notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt
    ),
  ]
);

export const toppings = pgTable("toppings", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  emoji: text("emoji").notNull().default(""),
  foto: text("foto"),
  fotoVersion: bigint("foto_version", { mode: "number" }).notNull().default(0),
  imageUrl: text("image_url"),
  harga: integer("harga").notNull().default(0),
  stok: integer("stok").notNull().default(0),
  tersedia: boolean("tersedia").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    uid: text("uid"),
    tanggal: text("tanggal").notNull(),
    nomor: serial("nomor").notNull(),
    nama: text("nama").notNull(),
    nomorWhatsApp: text("nomor_whatsapp").notNull().default(""),
    sumber: text("sumber").notNull(),
    daftarTopping: jsonb("daftar_topping").$type<OrderTopping[]>().notNull().default([]),
    totalHarga: integer("total_harga").notNull().default(0),
    catatan: text("catatan").notNull().default(""),
    waktuAmbil: text("waktu_ambil").notNull().default(""),
    statusBayar: text("status_bayar").notNull(),
    statusPesanan: text("status_pesanan").notNull(),
    waktuDibuat: timestamp("waktu_dibuat", { withTimezone: true }).defaultNow().notNull(),
    batasBayar: timestamp("batas_bayar", { withTimezone: true }),
    buktiBayar: text("bukti_bayar"),
    buktiVersion: bigint("bukti_version", { mode: "number" }).notNull().default(0),
    waktuUnggahBukti: timestamp("waktu_unggah_bukti", { withTimezone: true }),
    alasanPenolakan: text("alasan_penolakan"),
  },
  (t) => [uniqueIndex("orders_nomor_uq").on(t.nomor)]
);

export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey(),
  qrisImage: text("qris_image"),
  qrisVersion: bigint("qris_version", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

