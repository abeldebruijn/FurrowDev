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
export const visionMessageRole = pgEnum("vision_message_role", ["assistant", "user"]);
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

export type IdeaUserStory = {
  id: string;
  outcome: string;
  story: string;
};

export type IdeaTaskMetadata = Record<string, unknown>;

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

export const visions = pgTable("vision", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled vision"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visionMessages = pgTable(
  "vision_message",
  {
    id: uuid("id").primaryKey(),
    visionId: uuid("vision_id")
      .notNull()
      .references(() => visions.id, { onDelete: "cascade" }),
    role: visionMessageRole("role").notNull(),
    content: text("content").notNull(),
    order: integer("order").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("vision_message_order_unique").on(table.visionId, table.order)],
);

export const visionCollaborators = pgTable(
  "vision_collaborator",
  {
    visionId: uuid("vision_id")
      .notNull()
      .references(() => visions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedByUserId: uuid("added_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.visionId, table.userId] })],
);

export const visionSummaryDocuments = pgTable("vision_summary_document", {
  visionId: uuid("vision_id")
    .primaryKey()
    .references(() => visions.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ideas = pgTable("idea", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sourceVisionId: uuid("source_vision_id")
    .notNull()
    .unique()
    .references(() => visions.id),
  roadmapItemId: uuid("roadmap_item_id").references(() => roadmapItems.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  context: text("context").notNull().default(""),
  specSheet: text("spec_sheet").notNull().default(""),
  userStories: jsonb("user_stories").$type<IdeaUserStory[]>().notNull().default([]),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ideaTasks = pgTable("idea_task", {
  id: uuid("id").primaryKey(),
  ideaId: uuid("idea_id")
    .notNull()
    .references(() => ideas.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull(),
  metadata: jsonb("metadata").$type<IdeaTaskMetadata>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ideaSubtasks = pgTable("idea_subtask", {
  id: uuid("id").primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => ideaTasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull(),
  metadata: jsonb("metadata").$type<IdeaTaskMetadata>().notNull().default({}),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ideaTaskDependencies = pgTable(
  "idea_task_dependency",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => ideaTasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => ideaTasks.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.dependsOnTaskId] }),
    check("idea_task_dependency_no_self", sql`${table.taskId} <> ${table.dependsOnTaskId}`),
  ],
);

export const ideaSubtaskDependencies = pgTable(
  "idea_subtask_dependency",
  {
    subtaskId: uuid("subtask_id")
      .notNull()
      .references(() => ideaSubtasks.id, { onDelete: "cascade" }),
    dependsOnSubtaskId: uuid("depends_on_subtask_id")
      .notNull()
      .references(() => ideaSubtasks.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.subtaskId, table.dependsOnSubtaskId] }),
    check(
      "idea_subtask_dependency_no_self",
      sql`${table.subtaskId} <> ${table.dependsOnSubtaskId}`,
    ),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  ownedOrganisations: many(organisations),
  userOwnedConceptProjects: many(conceptProjects),
  userOwnedProjects: many(projects),
  conceptProjectChatMessages: many(conceptProjectChatMessages),
  adminAssignments: many(admins),
  maintainerAssignments: many(maintainers),
  ownedVisions: many(visions),
  authoredVisionMessages: many(visionMessages, {
    relationName: "visionMessageAuthor",
  }),
  visionCollaborations: many(visionCollaborators, {
    relationName: "visionCollaboratorUser",
  }),
  addedVisionCollaborations: many(visionCollaborators, {
    relationName: "visionCollaboratorAddedByUser",
  }),
  createdIdeas: many(ideas),
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
  ideas: many(ideas),
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
  visions: many(visions),
  ideas: many(ideas),
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

export const visionsRelations = relations(visions, ({ one, many }) => ({
  project: one(projects, {
    fields: [visions.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [visions.ownerUserId],
    references: [users.id],
  }),
  messages: many(visionMessages),
  collaborators: many(visionCollaborators),
  summaryDocument: one(visionSummaryDocuments, {
    fields: [visions.id],
    references: [visionSummaryDocuments.visionId],
  }),
  idea: one(ideas, {
    fields: [visions.id],
    references: [ideas.sourceVisionId],
  }),
}));

export const visionMessagesRelations = relations(visionMessages, ({ one }) => ({
  vision: one(visions, {
    fields: [visionMessages.visionId],
    references: [visions.id],
  }),
  author: one(users, {
    fields: [visionMessages.authorUserId],
    references: [users.id],
    relationName: "visionMessageAuthor",
  }),
}));

export const visionCollaboratorsRelations = relations(visionCollaborators, ({ one }) => ({
  vision: one(visions, {
    fields: [visionCollaborators.visionId],
    references: [visions.id],
  }),
  user: one(users, {
    fields: [visionCollaborators.userId],
    references: [users.id],
    relationName: "visionCollaboratorUser",
  }),
  addedByUser: one(users, {
    fields: [visionCollaborators.addedByUserId],
    references: [users.id],
    relationName: "visionCollaboratorAddedByUser",
  }),
}));

export const visionSummaryDocumentsRelations = relations(visionSummaryDocuments, ({ one }) => ({
  vision: one(visions, {
    fields: [visionSummaryDocuments.visionId],
    references: [visions.id],
  }),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  project: one(projects, {
    fields: [ideas.projectId],
    references: [projects.id],
  }),
  sourceVision: one(visions, {
    fields: [ideas.sourceVisionId],
    references: [visions.id],
  }),
  roadmapItem: one(roadmapItems, {
    fields: [ideas.roadmapItemId],
    references: [roadmapItems.id],
  }),
  createdBy: one(users, {
    fields: [ideas.createdByUserId],
    references: [users.id],
  }),
  tasks: many(ideaTasks),
}));

export const ideaTasksRelations = relations(ideaTasks, ({ one, many }) => ({
  idea: one(ideas, {
    fields: [ideaTasks.ideaId],
    references: [ideas.id],
  }),
  subtasks: many(ideaSubtasks),
  dependencies: many(ideaTaskDependencies, {
    relationName: "ideaTaskDependencySource",
  }),
  dependents: many(ideaTaskDependencies, {
    relationName: "ideaTaskDependencyTarget",
  }),
}));

export const ideaSubtasksRelations = relations(ideaSubtasks, ({ one, many }) => ({
  task: one(ideaTasks, {
    fields: [ideaSubtasks.taskId],
    references: [ideaTasks.id],
  }),
  dependencies: many(ideaSubtaskDependencies, {
    relationName: "ideaSubtaskDependencySource",
  }),
  dependents: many(ideaSubtaskDependencies, {
    relationName: "ideaSubtaskDependencyTarget",
  }),
}));

export const ideaTaskDependenciesRelations = relations(ideaTaskDependencies, ({ one }) => ({
  task: one(ideaTasks, {
    fields: [ideaTaskDependencies.taskId],
    references: [ideaTasks.id],
    relationName: "ideaTaskDependencySource",
  }),
  dependsOnTask: one(ideaTasks, {
    fields: [ideaTaskDependencies.dependsOnTaskId],
    references: [ideaTasks.id],
    relationName: "ideaTaskDependencyTarget",
  }),
}));

export const ideaSubtaskDependenciesRelations = relations(ideaSubtaskDependencies, ({ one }) => ({
  subtask: one(ideaSubtasks, {
    fields: [ideaSubtaskDependencies.subtaskId],
    references: [ideaSubtasks.id],
    relationName: "ideaSubtaskDependencySource",
  }),
  dependsOnSubtask: one(ideaSubtasks, {
    fields: [ideaSubtaskDependencies.dependsOnSubtaskId],
    references: [ideaSubtasks.id],
    relationName: "ideaSubtaskDependencyTarget",
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
  visions,
  visionsRelations,
  visionMessages,
  visionMessagesRelations,
  visionCollaborators,
  visionCollaboratorsRelations,
  visionSummaryDocuments,
  visionSummaryDocumentsRelations,
  ideas,
  ideasRelations,
  ideaTasks,
  ideaTasksRelations,
  ideaSubtasks,
  ideaSubtasksRelations,
  ideaTaskDependencies,
  ideaTaskDependenciesRelations,
  ideaSubtaskDependencies,
  ideaSubtaskDependenciesRelations,
};
