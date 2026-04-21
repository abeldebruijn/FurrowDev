# Ubiquitous Language

## Core lifecycle

| Term                 | Definition                                                                                                                                                             | Aliases to avoid                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **FurrowDev**        | A cloud-hosted git platform built around realtime, agent-native project development.                                                                                   | App, tool, dashboard             |
| **Concept Project**  | The entry-point project state where a new idea is discovered and shaped with an agent.                                                                                 | Draft project, idea, proposal    |
| **Project**          | A full project that has graduated from a **Concept Project**.                                                                                                          | Repo, final concept, workspace   |
| **Vision**           | A private project-scoped discovery conversation used to explore what the project may build next.                                                                       | Draft idea, private idea, thread |
| **Idea**             | A project-visible work item created from a **Vision** that carries **Idea Context**, an optional **Roadmap Item** link, an **Idea Conversation**, and owned **Tasks**. | Proposal, concept, ticket        |
| **Graduation**       | The state change where a **Concept Project** becomes a **Project** and the original concept becomes a read-only record.                                                | Promotion, conversion, publish   |
| **Discovery Flow**   | The staged agent conversation that shapes a **Concept Project** before **Graduation**.                                                                                 | Onboarding, intake, setup flow   |
| **Discovery Record** | The archived read-only **Concept Project** preserved after **Graduation**.                                                                                             | Archive, old draft, concept copy |

## Discovery flow

| Term                 | Definition                                                                                                                           | Aliases to avoid                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **Stage**            | One named step inside the **Discovery Flow**.                                                                                        | Step, phase, screen                     |
| **What Stage**       | The **Stage** where the **Agent** learns what the project is about.                                                                  | Idea stage, concept stage               |
| **For Whom Stage**   | The **Stage** where the **Agent** learns the target audience and expected scale.                                                     | Audience stage, user stage              |
| **How Stage**        | The **Stage** where the **Agent** learns the high-level technical shape and constraints.                                             | Technical stage, implementation stage   |
| **Setup Stage**      | The **Stage** where the bootstrap structure, stack, and core tooling are defined before optional pressure-testing or **Graduation**. | Build stage, next step                  |
| **Grill Me Stage**   | The optional post-setup **Stage** where the plan is pressure-tested for missing assumptions, constraints, and tradeoffs.             | Review stage, challenge stage, QA stage |
| **Stage Summary**    | The persisted understanding captured at the end of a **Stage**.                                                                      | Notes, recap, conclusion                |
| **What Summary**     | The **Stage Summary** for the **What Stage**.                                                                                        | Concept summary                         |
| **For Whom Summary** | The **Stage Summary** for the **For Whom Stage**.                                                                                    | Audience summary                        |
| **How Summary**      | The **Stage Summary** for the **How Stage**.                                                                                         | Technical summary                       |
| **Setup Summary**    | The **Stage Summary** for the **Setup Stage** or a refined summary saved from the **Grill Me Stage**.                                | Bootstrap notes, stack summary          |

## Discovery artifacts

| Term                        | Definition                                                                                                        | Aliases to avoid                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Chat**                    | The conversation attached to one **Concept Project**, one **Vision**, or one **Idea**.                            | Thread, prompt                      |
| **Transcript**              | The ordered history of all **Messages** in a **Chat**.                                                            | Chat log, history dump              |
| **Message**                 | A single entry in a **Chat** written by a **User** or an **Agent**.                                               | Comment, line, event                |
| **Name**                    | The canonical title of a **Concept Project** or **Project**.                                                      | Label, slug, heading                |
| **Description**             | The short narrative summary of a **Concept Project** or **Project**.                                              | Notes, body, overview               |
| **Vision Summary Document** | The hidden rolling summary of a **Vision** that preserves current understanding and later feeds **Idea Context**. | Background file, memory file, notes |
| **Idea Context**            | The summary text attached to an **Idea** when a **Vision** is converted into a shared artifact.                   | Summary, context field, recap       |
| **Roadmap**                 | The structured plan attached to a **Concept Project** and organized into versioned milestones.                    | Plan, checklist, task list          |
| **Roadmap Item**            | A high-level scoped capability or milestone item within a **Roadmap**.                                            | Task, step, ticket                  |
| **Roadmap Version**         | A numbered milestone inside a **Roadmap** identified by `major.minor`.                                            | Milestone number, version node      |
| **Current Roadmap Version** | The persisted **Roadmap Version** that represents the latest active milestone in a **Roadmap**.                   | Latest version, active milestone    |
| **Setup Roadmap**           | The `v0.0` slice of the **Roadmap** that contains bootstrap and tooling tasks rather than product features.       | Bootstrap plan, install checklist   |
| **Version Trail**           | The ordered visual sequence of **Roadmap Versions** shown in the concept project experience.                      | Timeline, roadmap strip             |
| **Generated Name Ideas**    | A temporary list of candidate **Names** proposed inside **Concept Project Settings**.                             | Suggestions, options, alternates    |
| **Generated Description**   | The current persisted **Description** shown in **Concept Project Settings**.                                      | Summary text, project blurb         |

## Idea execution

| Term                   | Definition                                                                                                      | Aliases to avoid                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Idea Conversation**  | The **Chat** attached to one **Idea** after it becomes visible to the project.                                  | Vision chat, thread, comments         |
| **Spec Sheet**         | The structured specification attached to an **Idea** that describes the intended behavior and constraints.      | Requirements doc, design doc, brief   |
| **User Story**         | A user-centered requirement attached to an **Idea** that states who needs what outcome and why.                 | Requirement, acceptance note, feature |
| **Task**               | A structured actionable unit of work inside one **Idea** that is completed through its **SubTasks**.            | Ticket, roadmap item, issue           |
| **Task Dependency**    | A prerequisite relationship where one **Task** cannot begin or finish until another **Task** is complete.       | Blocker, linked task, dependency list |
| **SubTask**            | An atomic implementation unit inside one **Task** assigned to a **User** or **Agent**.                          | Step, checklist item, mini task       |
| **SubTask Dependency** | A prerequisite relationship where one **SubTask** cannot begin or finish until another **SubTask** is complete. | Blocker, linked subtask, step order   |
| **Merge**              | The reviewable integration artifact created after a **Task** is done.                                           | Pull request, merge request, PR       |

## Actions

| Term                    | Definition                                                                                      | Aliases to avoid               |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------ |
| **Grill Me**            | The action that moves a **Concept Project** into the **Grill Me Stage** for deeper questioning. | Review, inspect, challenge     |
| **Graduate to Project** | The action that performs **Graduation** and creates the real **Project**.                       | Finish, launch, convert button |

## Management

| Term                         | Definition                                                                                | Aliases to avoid                |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
| **Concept Project Settings** | The dialog where a **User** can manage metadata for a **Concept Project**.                | Preferences, config, edit modal |
| **Delete Concept Project**   | The irreversible action that removes a **Concept Project** and its dependent records.     | Remove project, archive, close  |
| **Project Settings**         | The project-level screen or controls where a **User** manages metadata for a **Project**. | Preferences, config, edit modal |
| **Vision Collaborator**      | A **User** explicitly added to a **Vision** so they can view its private conversation.    | Project member, watcher, guest  |

## Roadmap interface

| Term               | Definition                                                                                | Aliases to avoid                            |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Roadmap Rail**   | The fixed top-of-screen UI that displays the **Version Trail** for a **Concept Project**. | Sticky header, timeline bar, roadmap parent |
| **Roadmap Node**   | One visual card in the **Roadmap Rail** representing a single **Roadmap Version**.        | Box, item card, milestone card              |
| **Collapsed Rail** | The compact **Roadmap Rail** state that shows version numbers only.                       | Minimized rail, compressed timeline         |
| **Expanded Rail**  | The detailed **Roadmap Rail** state that shows version numbers and short labels.          | Open rail, full timeline                    |

## Actors

| Term             | Definition                                                                                    | Aliases to avoid          |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------- |
| **User**         | The authenticated person who creates and owns work in FurrowDev.                              | Account, person, customer |
| **Agent**        | The system participant that helps discover a project and generates initial project artifacts. | Bot, assistant, AI        |
| **Organisation** | A group owner that can own a **Concept Project** or **Project** instead of a single **User**. | Team, workspace, company  |

## Project workspace

| Term                   | Definition                                                                                                        | Aliases to avoid                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Project Dashboard**  | The main project screen where a **Project** is viewed and arranged through tabs and widgets.                      | Project page, dashboard page, board      |
| **Overview Tab**       | The **Project Dashboard** tab that shows the project's core description.                                          | Main tab, home tab                       |
| **Files Tab**          | The **Project Dashboard** tab reserved for project files.                                                         | Code tab, repository tab                 |
| **Branches Tab**       | The **Project Dashboard** tab reserved for project branches.                                                      | Git branches, branch page                |
| **Ideas Tab**          | The **Project Dashboard** tab where private **Visions** are listed and where shared **Ideas** will later surface. | Concepts tab, proposal tab               |
| **Merges Tab**         | The **Project Dashboard** tab reserved for project merges.                                                        | Pull requests, merge requests            |
| **Moderation Tab**     | The **Project Dashboard** tab only shown for organisation-owned projects to eligible users.                       | Admin tab, review tab                    |
| **Settings Tab**       | The **Project Dashboard** tab where project-level settings are managed by eligible users.                         | Preferences tab, config tab              |
| **Widget**             | A reusable project dashboard module rendered at a fixed size inside a **Widget Layout**.                          | Card, tile, panel                        |
| **Widget Variant**     | One draggable size-specific version of a **Widget** offered in the **Add Widget Panel**.                          | Widget size, widget preview, widget type |
| **Widget Layout**      | The ordered desktop arrangement of **Widgets** on a **Project Dashboard**.                                        | Grid, board, dashboard layout            |
| **Placed Widget**      | A **Widget** that has been added into the current **Widget Layout**.                                              | Dropped widget, active widget            |
| **Temporary Layout**   | The in-memory **Widget Layout** used during editing before persistence exists.                                    | Draft layout, unsaved layout, temp state |
| **Edit Mode**          | The project dashboard state where widgets can be added, reordered, or deleted.                                    | Builder mode, layout mode                |
| **Add Widget Panel**   | The bottom panel used to browse and drag **Widget Variants** into the **Widget Layout**.                          | Widget picker, widget tray, add modal    |
| **Drop Zone**          | The visible area of the **Project Dashboard** that accepts dropped **Widget Variants**.                           | Target area, board area                  |
| **Placement Preview**  | The ghost slot shown inside the **Drop Zone** before a dragged **Widget Variant** is released.                    | Hover preview, placement ghost           |
| **Delete Drop Target** | The temporary target shown next to Done that deletes a **Placed Widget** when dropped onto it.                    | Delete area, trash zone                  |
| **Inline Delete**      | The edit-mode-only circular control on a **Placed Widget** that removes it immediately.                           | Close button, remove icon                |
| **Packed Placement**   | The deterministic top-left-first placement rule that keeps the **Widget Layout** as tight as possible.            | Auto-pack, compact placement             |

## Relationships

- A **User** creates a **Concept Project**.
- An **Organisation** may own a **Concept Project** or **Project** in place of a **User**.
- A **Concept Project** moves through the **What Stage**, **For Whom Stage**, **How Stage**, and **Setup Stage** in order.
- A **Concept Project** may enter the **Grill Me Stage** only after the **Setup Stage** has been understood.
- A **Concept Project** has exactly one **Chat**.
- A **Chat** contains one or more **Messages** over time.
- A **Transcript** is the ordered view of those **Messages**.
- An **Agent** and a **User** both author **Messages** in a **Chat**.
- Each discovery **Stage** can produce exactly one persisted **Stage Summary**.
- A **Concept Project** may have one **Roadmap**.
- A **Roadmap** contains zero or more **Roadmap Items**.
- A **Roadmap** contains one or more **Roadmap Versions** when it has versioned content.
- A **Roadmap Version** contains one or more **Roadmap Items**.
- A **Roadmap** has at most one **Current Roadmap Version** at a time.
- A **Project** can have zero or more **Visions**.
- A **Vision** belongs to exactly one **Project**.
- A **Vision** has exactly one owner **User**.
- A **Vision** can have zero or more **Vision Collaborators**.
- A **Vision Collaborator** gains access to a **Vision** only through explicit invitation, not through general **Project** access alone.
- A **Vision** has one **Chat**, one **Transcript**, and one **Vision Summary Document**.
- A **Vision Summary Document** is refreshed from the **Vision** conversation over time.
- A **Vision** can later become one **Idea**.
- An **Idea** receives its initial **Idea Context** from the **Vision Summary Document**.
- An **Idea** may link to zero or one **Roadmap Item** for roadmap context.
- An **Idea** has exactly one **Idea Conversation**.
- An **Idea** may have one **Spec Sheet** and zero or more **User Stories**.
- An **Idea** contains one or more **Tasks**.
- A **Task** belongs to exactly one **Idea**.
- A **Task** may depend on zero or more other **Tasks** in the same **Idea**.
- A **Task** contains one or more **SubTasks**.
- A **SubTask** belongs to exactly one **Task**.
- A **SubTask** may depend on zero or more other **SubTasks** in the same **Task**.
- A **Task** is done only when all of its **SubTasks** are done.
- An **Idea** is done only when all of its **Tasks** are done.
- A **Task** converts into at most one **Merge** after it is done.
- A **Merge** belongs to exactly one completed **Task**.
- **Task** completion is a rollup from **SubTask** completion, not a direct user-controlled state.
- The **Setup Roadmap** is always the `v0.0` portion of a **Roadmap**.
- The **Roadmap Rail** renders the **Version Trail** for a **Roadmap**.
- Each **Roadmap Node** represents exactly one **Roadmap Version**.
- A **Concept Project** can graduate into at most one **Project**.
- A **Project** may originate from exactly one **Concept Project**.
- **Grill Me** enters the **Grill Me Stage** without removing access to **Graduate to Project**.
- **Graduate to Project** creates the **Project** and leaves the original **Concept Project** behind as the **Discovery Record**.
- **Generated Name Ideas** belong to **Concept Project Settings** and do not change the persisted **Name** until the **User** saves.
- **Delete Concept Project** removes the **Concept Project**, its **Chat**, its **Transcript**, and its generated **Roadmap**.

## Example dialogue (Project workspace)

> **Dev:** "After the **Setup Stage**, is the project ready for **Graduation**?"
> **Domain expert:** "It can be, but the user may also enter the **Grill Me Stage** first to pressure-test the plan."
> **Dev:** "What does the **Grill Me Stage** change?"
> **Domain expert:** "It can refine the **Setup Summary** and the `v0.0` **Setup Roadmap**, but it does not block **Graduate to Project**."
> **Dev:** "What happens when the user picks **Graduate to Project**?"
> **Domain expert:** "The system performs **Graduation**, creates the real **Project**, and keeps the original **Concept Project** as the **Discovery Record**."
> **Dev:** "So the original concept is not deleted?"
> **Domain expert:** "Correct. It becomes a read-only **Discovery Record**, not a second **Project**."

## Flagged ambiguities

- "project" was used loosely to mean both **Concept Project** and **Project**. Use **Concept Project** for the pre-graduation state and **Project** only after **Graduation**.
- "vision", "idea", and "concept" can drift together. Use **Vision** for the private pre-sharing conversation, **Idea** for the later shared artifact, and **Concept Project** only for the separate staged discovery flow that creates a **Project**.
- "archive", "read-only concept", and "discovery record" were used for the same post-graduation artifact. Use **Discovery Record** for the preserved concept after **Graduation**.
- "grill me" can refer to either a button or a stage. Use **Grill Me** for the action and **Grill Me Stage** for the persisted stage.
- "chat", "message", and "transcript" are related but distinct. A **Chat** is the container, a **Message** is one item, and a **Transcript** is the ordered history view.
- "project member", "owner", and **Vision Collaborator** are not equivalent. Use **Vision Collaborator** only for users explicitly granted access to a private **Vision**.
- "summary", "context", and "background file" can drift together. Use **Vision Summary Document** for the hidden rolling record during a **Vision** and **Idea Context** for the summary attached to an **Idea** later.
- "roadmap" and "roadmap item" are related but distinct. A **Roadmap** is the whole plan; a **Roadmap Item** is high-level roadmap scope, not executable **Task** work.
- "task", "ticket", and "roadmap item" can drift together. Use **Task** only for actionable work inside an **Idea** and **Roadmap Item** only for roadmap-level scope.
- "`Idea.is_merge`" conflicts with the domain language if it implies an **Idea** converts into a **Merge**. Say a **Task** converts into a **Merge** unless the schema is changed to model **Idea** conversion directly.
- "done" can mean different rollup levels. A **SubTask** is the atomic completion unit, a **Task** is done when all **SubTasks** are done, and an **Idea** is done when all **Tasks** are done.
- "setup roadmap", "setup plan", and "v0.0 tasks" can drift together. Use **Setup Roadmap** for the bootstrap-focused `v0.0` roadmap slice.
- "roadmap version", "stage", and "milestone" can drift together. Use **Stage** for discovery flow progress and **Roadmap Version** for numbered roadmap progression.
- "rail", "trail", and "timeline" were used interchangeably. Use **Roadmap Rail** for the fixed UI container and **Version Trail** for the ordered version sequence it displays.
- "user", "account", and "person" can drift together. Use **User** for the authenticated actor in the product.
- "settings" can drift into generic UI language. Use **Concept Project Settings** for the dialog tied to one **Concept Project**.
- "suggestions", "ideas", and "names" were used interchangeably. Use **Generated Name Ideas** for temporary suggestions and **Name** for the persisted project title.
- "delete", "remove", and "archive" are not equivalent. Use **Delete Concept Project** only for the irreversible destructive action.
- "widget", "widget variant", and "placed widget" are related but distinct. Use **Widget** for the dashboard module, **Widget Variant** for the draggable size-specific option, and **Placed Widget** once it has been added to the **Widget Layout**.
- "layout", "board", and "grid" were used interchangeably. Use **Widget Layout** for the arranged widget state and **Drop Zone** for the visible area that accepts drops.
- "preview", "ghost", and "slot" were used for the same temporary indicator. Use **Placement Preview** for the pre-drop visual position marker.
- "delete button", "trash", and "remove target" were used for different deletion mechanisms. Use **Delete Drop Target** for drag-to-delete and **Inline Delete** for the per-widget circular action.
- "edit mode", "widget edit", and "builder mode" were used interchangeably. Use **Edit Mode** for the URL-driven project state where widget layout editing is allowed.
- "temporary layout", "client state", and "session-only layout" were used for the same non-persisted concept. Use **Temporary Layout**.

## Additional relationships

- A **Project Dashboard** belongs to exactly one **Project**.
- A **Project Dashboard** exposes one or more dashboard tabs, including the **Overview Tab**.
- The **Ideas Tab** is the entry point for creating a **Vision** inside a **Project**.
- A **Widget Layout** belongs to exactly one **Project Dashboard**.
- A **Widget Layout** contains zero or more **Placed Widgets**.
- A **Placed Widget** is created by dropping a **Widget Variant** from the **Add Widget Panel** into the **Drop Zone**.
- **Edit Mode** reveals the **Add Widget Panel**, **Inline Delete**, and drag-based layout editing affordances.
- A **Placement Preview** appears only while a **Widget Variant** is being dragged over the **Drop Zone**.
- The **Delete Drop Target** can remove exactly one dragged **Placed Widget** at a time.
- **Packed Placement** determines where a new **Placed Widget** lands inside the **Temporary Layout**.

## Example dialogue

> **Dev:** "When a private **Vision** is shared, what does the **Idea** keep?"
> **Domain expert:** "The **Idea** keeps the **Idea Context**, may link to a **Roadmap Item**, and gets its own **Idea Conversation**."
> **Dev:** "Where do implementation steps live?"
> **Domain expert:** "The **Idea** owns **Tasks**, and each **Task** is broken into **SubTasks** for human or **Agent** execution."
> **Dev:** "Can a user mark the **Task** done?"
> **Domain expert:** "No. A **Task** is done only when all of its **SubTasks** are done."
> **Dev:** "When do we create a **Merge**?"
> **Domain expert:** "After the **Task** is done, that completed **Task** converts into a **Merge**."
