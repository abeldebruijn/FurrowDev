import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  jsonb,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const conceptProjectChatMessageType = pgEnum("concept_project_chat_message_type", [
  "agent",
  "person",
]);
export const conceptProjectStage = pgEnum("concept_project_stage", [
  "what",
  "for_whom",
  "how",
  "setup",
  "grill_me",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  workosUserId: text("workos_user_id").notNull().unique(),
  name: text("name").notNull(),
});

export const organisations = pgTable("organisation", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
});

export const roadmaps = pgTable("roadmap", {
  id: uuid("id").primaryKey(),
  rootRoadmapId: uuid("root_roadmap_id").references((): AnyPgColumn => roadmaps.id, {
    onDelete: "set null",
  }),
  embedUrl: text("embed_url"),
  currentMajor: integer("current_major").notNull().default(0),
  currentMinor: integer("current_minor").notNull().default(0),
});

export const roadmapItems = pgTable("roadmap_item", {
  id: uuid("id").primaryKey(),
  roadmapId: uuid("roadmap_id")
    .notNull()
    .references(() => roadmaps.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => roadmapItems.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  majorVersion: integer("major_version").notNull(),
  minorVersion: integer("minor_version").notNull(),
});

export const conceptProjects = pgTable(
  "concept_project",
  {
    id: uuid("id").primaryKey(),
    name: text("name"),
    description: text("description"),
    currentStage: conceptProjectStage("current_stage").notNull().default("what"),
    whatSummary: text("what_summary"),
    forWhomSummary: text("for_whom_summary"),
    howSummary: text("how_summary"),
    setupSummary: text("setup_summary"),
    understoodWhatAt: timestamp("understood_what_at", { withTimezone: true }),
    understoodForWhomAt: timestamp("understood_for_whom_at", { withTimezone: true }),
    understoodHowAt: timestamp("understood_how_at", { withTimezone: true }),
    understoodSetupAt: timestamp("understood_setup_at", { withTimezone: true }),
    roadmapId: uuid("roadmap_id").references(() => roadmaps.id, { onDelete: "set null" }),
    userOwner: uuid("user_owner").references(() => users.id, { onDelete: "cascade" }),
    orgOwner: uuid("org_owner").references(() => organisations.id, { onDelete: "cascade" }),
  },
  (table) => [
    check(
      "concept_project_exactly_one_owner",
      sql`(case when ${table.userOwner} is null then 0 else 1 end) + (case when ${table.orgOwner} is null then 0 else 1 end) = 1`,
    ),
    uniqueIndex("concept_project_user_owner_name_unique")
      .on(table.name, table.userOwner)
      .where(sql`${table.name} is not null and ${table.userOwner} is not null`),
    uniqueIndex("concept_project_org_owner_name_unique")
      .on(table.name, table.orgOwner)
      .where(sql`${table.name} is not null and ${table.orgOwner} is not null`),
  ],
);

export const conceptProjectChats = pgTable("concept_project_chat", {
  id: uuid("id").primaryKey(),
  conceptProjectId: uuid("concept_project_id")
    .notNull()
    .unique()
    .references(() => conceptProjects.id, { onDelete: "cascade" }),
});

export const conceptProjectChatMessages = pgTable(
  "concept_project_chat_message",
  {
    id: uuid("id").primaryKey(),
    message: text("message").notNull(),
    order: integer("order").notNull(),
    type: conceptProjectChatMessageType("type").notNull(),
    stage: conceptProjectStage("stage").notNull().default("what"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    conceptProjectChatId: uuid("concept_project_chat_id")
      .notNull()
      .references(() => conceptProjectChats.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("concept_project_chat_message_order_unique").on(
      table.conceptProjectChatId,
      table.order,
    ),
  ],
);

export const projects = pgTable(
  "project",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    ubiquitousLanguageMarkdown: text("ubiquitous_language_markdown"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    roadmapId: uuid("roadmap_id").references(() => roadmaps.id, { onDelete: "set null" }),
    widgetLayoutId: uuid("widget_layout_id").references(() => projectWidgetLayouts.id, {
      onDelete: "set null",
    }),
    conceptProjectId: uuid("concept_project_id").references(() => conceptProjects.id, {
      onDelete: "set null",
    }),
    userOwner: uuid("user_owner").references(() => users.id, { onDelete: "cascade" }),
    orgOwner: uuid("org_owner").references(() => organisations.id, { onDelete: "cascade" }),
  },
  (table) => [
    check(
      "project_exactly_one_owner",
      sql`(case when ${table.userOwner} is null then 0 else 1 end) + (case when ${table.orgOwner} is null then 0 else 1 end) = 1`,
    ),
    uniqueIndex("project_concept_project_unique")
      .on(table.conceptProjectId)
      .where(sql`${table.conceptProjectId} is not null`),
    uniqueIndex("project_widget_layout_unique")
      .on(table.widgetLayoutId)
      .where(sql`${table.widgetLayoutId} is not null`),
  ],
);

export type ProjectWidgetLayoutItem = {
  widgetName: string;
  xPos: number;
  yPos: number;
  wSize: number;
  hSize: number;
};

export const projectWidgetLayouts = pgTable("project_widget_layout", {
  id: uuid("id").primaryKey(),
  version: integer("version").notNull().default(1),
  largeLayout: jsonb("large_layout").$type<ProjectWidgetLayoutItem[]>().notNull(),
  mediumLayout: jsonb("medium_layout").$type<ProjectWidgetLayoutItem[] | null>(),
  mediumAutoLayout: boolean("medium_auto_layout").notNull().default(true),
  smallLayout: jsonb("small_layout").$type<ProjectWidgetLayoutItem[] | null>(),
  smallAutoLayout: boolean("small_auto_layout").notNull().default(true),
});

export const admins = pgTable(
  "admins",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.projectId] })],
);

export const maintainers = pgTable(
  "maintainers",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.projectId] })],
);

export const usersRelations = relations(users, ({ many }) => ({
  ownedOrganisations: many(organisations),
  userOwnedConceptProjects: many(conceptProjects),
  userOwnedProjects: many(projects),
  conceptProjectChatMessages: many(conceptProjectChatMessages),
  adminAssignments: many(admins),
  maintainerAssignments: many(maintainers),
}));

export const organisationsRelations = relations(organisations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organisations.ownerId],
    references: [users.id],
  }),
  conceptProjects: many(conceptProjects),
  projects: many(projects),
}));

export const roadmapsRelations = relations(roadmaps, ({ one, many }) => ({
  rootRoadmap: one(roadmaps, {
    fields: [roadmaps.rootRoadmapId],
    references: [roadmaps.id],
    relationName: "rootRoadmap",
  }),
  childRoadmaps: many(roadmaps, {
    relationName: "rootRoadmap",
  }),
  conceptProjects: many(conceptProjects),
  items: many(roadmapItems),
}));

export const roadmapItemsRelations = relations(roadmapItems, ({ one, many }) => ({
  roadmap: one(roadmaps, {
    fields: [roadmapItems.roadmapId],
    references: [roadmaps.id],
  }),
  parent: one(roadmapItems, {
    fields: [roadmapItems.parentId],
    references: [roadmapItems.id],
    relationName: "roadmapItemParent",
  }),
  children: many(roadmapItems, {
    relationName: "roadmapItemParent",
  }),
}));

export const conceptProjectsRelations = relations(conceptProjects, ({ one }) => ({
  ownerUser: one(users, {
    fields: [conceptProjects.userOwner],
    references: [users.id],
  }),
  ownerOrganisation: one(organisations, {
    fields: [conceptProjects.orgOwner],
    references: [organisations.id],
  }),
  roadmap: one(roadmaps, {
    fields: [conceptProjects.roadmapId],
    references: [roadmaps.id],
  }),
  chat: one(conceptProjectChats, {
    fields: [conceptProjects.id],
    references: [conceptProjectChats.conceptProjectId],
  }),
  project: one(projects, {
    fields: [conceptProjects.id],
    references: [projects.conceptProjectId],
  }),
}));

export const conceptProjectChatsRelations = relations(conceptProjectChats, ({ one, many }) => ({
  conceptProject: one(conceptProjects, {
    fields: [conceptProjectChats.conceptProjectId],
    references: [conceptProjects.id],
  }),
  messages: many(conceptProjectChatMessages),
}));

export const conceptProjectChatMessagesRelations = relations(
  conceptProjectChatMessages,
  ({ one }) => ({
    user: one(users, {
      fields: [conceptProjectChatMessages.userId],
      references: [users.id],
    }),
    conceptProjectChat: one(conceptProjectChats, {
      fields: [conceptProjectChatMessages.conceptProjectChatId],
      references: [conceptProjectChats.id],
    }),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  conceptProject: one(conceptProjects, {
    fields: [projects.conceptProjectId],
    references: [conceptProjects.id],
  }),
  roadmap: one(roadmaps, {
    fields: [projects.roadmapId],
    references: [roadmaps.id],
  }),
  ownerUser: one(users, {
    fields: [projects.userOwner],
    references: [users.id],
  }),
  ownerOrganisation: one(organisations, {
    fields: [projects.orgOwner],
    references: [organisations.id],
  }),
  widgetLayout: one(projectWidgetLayouts, {
    fields: [projects.widgetLayoutId],
    references: [projectWidgetLayouts.id],
  }),
  admins: many(admins),
  maintainers: many(maintainers),
}));

export const projectWidgetLayoutsRelations = relations(projectWidgetLayouts, ({ one }) => ({
  project: one(projects, {
    fields: [projectWidgetLayouts.id],
    references: [projects.widgetLayoutId],
  }),
}));

export const adminsRelations = relations(admins, ({ one }) => ({
  user: one(users, {
    fields: [admins.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [admins.projectId],
    references: [projects.id],
  }),
}));

export const maintainersRelations = relations(maintainers, ({ one }) => ({
  user: one(users, {
    fields: [maintainers.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [maintainers.projectId],
    references: [projects.id],
  }),
}));

export const zeroDrizzleSchema = {
  users,
  usersRelations,
  organisations,
  organisationsRelations,
  roadmaps,
  roadmapsRelations,
  roadmapItems,
  roadmapItemsRelations,
  conceptProjects,
  conceptProjectsRelations,
  conceptProjectChats,
  conceptProjectChatsRelations,
  conceptProjectChatMessages,
  conceptProjectChatMessagesRelations,
  projects,
  projectsRelations,
  projectWidgetLayouts,
  projectWidgetLayoutsRelations,
  admins,
  adminsRelations,
  maintainers,
  maintainersRelations,
};
