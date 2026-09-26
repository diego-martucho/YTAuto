import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────

export const filterTypeEnum = pgEnum("filter_type", [
  "all",
  "title_contains",
  "title_any_of",
]);

export const videoStatusEnum = pgEnum("video_status", [
  "added",
  "filtered",
  "error",
]);

// ─── Auth.js Tables ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("provider_account_idx").on(
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_token_idx").on(table.identifier, table.token),
  ]
);

// ─── App Tables ──────────────────────────────────────────────────────

export const userSettings = pgTable("user_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("America/Argentina/Buenos_Aires"),
  syncTime: text("sync_time").notNull().default("00:00"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  notificationEmail: text("notification_email"),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const watchedChannels = pgTable("watched_channels", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  channelUrl: text("channel_url"),
  channelThumbnail: text("channel_thumbnail"),
  isActive: boolean("is_active").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const targetPlaylists = pgTable("target_playlists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  playlistId: text("playlist_id").notNull(),
  playlistName: text("playlist_name").notNull(),
  videosAddedCount: integer("videos_added_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const channelRules = pgTable("channel_rules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  watchedChannelId: text("watched_channel_id")
    .notNull()
    .references(() => watchedChannels.id, { onDelete: "cascade" }),
  targetPlaylistId: text("target_playlist_id")
    .notNull()
    .references(() => targetPlaylists.id, { onDelete: "cascade" }),
  filterType: filterTypeEnum("filter_type").notNull().default("all"),
  filterValue: text("filter_value"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const processedVideos = pgTable(
  "processed_videos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    videoId: text("video_id").notNull(),
    channelRuleId: text("channel_rule_id")
      .notNull()
      .references(() => channelRules.id, { onDelete: "cascade" }),
    targetPlaylistId: text("target_playlist_id")
      .notNull()
      .references(() => targetPlaylists.id, { onDelete: "cascade" }),
    videoTitle: text("video_title"),
    videoUrl: text("video_url"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    status: videoStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("video_rule_idx").on(table.videoId, table.channelRuleId),
  ]
);

export const syncLogs = pgTable("sync_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channelsChecked: integer("channels_checked").notNull().default(0),
  videosFound: integer("videos_found").notNull().default(0),
  videosAdded: integer("videos_added").notNull().default(0),
  videosFiltered: integer("videos_filtered").notNull().default(0),
  videosErrored: integer("videos_errored").notNull().default(0),
  quotaUsed: integer("quota_used").notNull().default(0),
  windowStart: timestamp("window_start", { mode: "date" }).notNull(),
  windowEnd: timestamp("window_end", { mode: "date" }).notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { mode: "date" }),
});

// ─── Relations ───────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  settings: one(userSettings),
  watchedChannels: many(watchedChannels),
  targetPlaylists: many(targetPlaylists),
  syncLogs: many(syncLogs),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const watchedChannelsRelations = relations(
  watchedChannels,
  ({ one, many }) => ({
    user: one(users, {
      fields: [watchedChannels.userId],
      references: [users.id],
    }),
    rules: many(channelRules),
  })
);

export const targetPlaylistsRelations = relations(
  targetPlaylists,
  ({ one, many }) => ({
    user: one(users, {
      fields: [targetPlaylists.userId],
      references: [users.id],
    }),
    rules: many(channelRules),
  })
);

export const channelRulesRelations = relations(
  channelRules,
  ({ one, many }) => ({
    watchedChannel: one(watchedChannels, {
      fields: [channelRules.watchedChannelId],
      references: [watchedChannels.id],
    }),
    targetPlaylist: one(targetPlaylists, {
      fields: [channelRules.targetPlaylistId],
      references: [targetPlaylists.id],
    }),
    processedVideos: many(processedVideos),
  })
);

export const processedVideosRelations = relations(
  processedVideos,
  ({ one }) => ({
    channelRule: one(channelRules, {
      fields: [processedVideos.channelRuleId],
      references: [channelRules.id],
    }),
    targetPlaylist: one(targetPlaylists, {
      fields: [processedVideos.targetPlaylistId],
      references: [targetPlaylists.id],
    }),
  })
);

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  user: one(users, {
    fields: [syncLogs.userId],
    references: [users.id],
  }),
}));
