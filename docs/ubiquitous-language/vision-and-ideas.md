# Vision and Ideas

## Vision and idea lifecycle

| Term       | Definition                                                                                                                                                             | Aliases to avoid                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Vision** | A private project-scoped discovery conversation used to explore what the project may build next.                                                                       | Draft idea, private idea, thread |
| **Idea**   | A project-visible work item created from a **Vision** that carries **Idea Context**, an optional **Roadmap Item** link, an **Idea Conversation**, and owned **Tasks**. | Proposal, concept, ticket        |

## Conversation artifacts

| Term                        | Definition                                                                                                        | Aliases to avoid                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Chat**                    | The conversation attached to one **Concept Project**, one **Vision**, or one **Idea**.                            | Thread, prompt                      |
| **Transcript**              | The ordered history of all **Messages** in a **Chat**.                                                            | Chat log, history dump              |
| **Message**                 | A single entry in a **Chat** written by a **User** or an **Agent**.                                               | Comment, line, event                |
| **Vision Summary Document** | The hidden rolling summary of a **Vision** that preserves current understanding and later feeds **Idea Context**. | Background file, memory file, notes |
| **Idea Context**            | The summary text attached to an **Idea** when a **Vision** is converted into a shared artifact.                   | Summary, context field, recap       |
| **Idea Conversation**       | The **Chat** attached to one **Idea** after it becomes visible to the project.                                    | Vision chat, thread, comments       |

## Idea execution

| Term                   | Definition                                                                                                      | Aliases to avoid                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Spec Sheet**         | The structured specification attached to an **Idea** that describes the intended behavior and constraints.      | Requirements doc, design doc, brief   |
| **User Story**         | A user-centered requirement attached to an **Idea** that states who needs what outcome and why.                 | Requirement, acceptance note, feature |
| **Task**               | A structured actionable unit of work inside one **Idea** that is completed through its **SubTasks**.            | Ticket, roadmap item, issue           |
| **Task Dependency**    | A prerequisite relationship where one **Task** cannot begin or finish until another **Task** is complete.       | Blocker, linked task, dependency list |
| **SubTask**            | An atomic implementation unit inside one **Task** assigned to a **User** or **Agent**.                          | Step, checklist item, mini task       |
| **SubTask Dependency** | A prerequisite relationship where one **SubTask** cannot begin or finish until another **SubTask** is complete. | Blocker, linked subtask, step order   |
| **Merge**              | The reviewable integration artifact created after a **Task** is done.                                           | Pull request, merge request, PR       |

## Management

| Term                    | Definition                                                                             | Aliases to avoid               |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------------------------ |
| **Vision Collaborator** | A **User** explicitly added to a **Vision** so they can view its private conversation. | Project member, watcher, guest |

## Relationships

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

## Example dialogue

> **Dev:** "When a private **Vision** is shared, what does the **Idea** keep?"
> **Domain expert:** "The **Idea** keeps the **Idea Context**, may link to a **Roadmap Item**, and gets its own **Idea Conversation**."
> **Dev:** "Where do implementation steps live?"
> **Domain expert:** "The **Idea** owns **Tasks**, and each **Task** is broken into **SubTasks** for human or **Agent** execution."
> **Dev:** "Can a user mark the **Task** done?"
> **Domain expert:** "No. A **Task** is done only when all of its **SubTasks** are done."
> **Dev:** "When do we create a **Merge**?"
> **Domain expert:** "After the **Task** is done, that completed **Task** converts into a **Merge**."

## Flagged ambiguities

- "vision", "idea", and "concept" can drift together. Use **Vision** for the private pre-sharing conversation, **Idea** for the later shared artifact, and **Concept Project** only for the separate staged discovery flow that creates a **Project**.
- "chat", "message", and "transcript" are related but distinct. A **Chat** is the container, a **Message** is one item, and a **Transcript** is the ordered history view.
- "project member", "owner", and **Vision Collaborator** are not equivalent. Use **Vision Collaborator** only for users explicitly granted access to a private **Vision**.
- "summary", "context", and "background file" can drift together. Use **Vision Summary Document** for the hidden rolling record during a **Vision** and **Idea Context** for the summary attached to an **Idea** later.
- "task", "ticket", and "roadmap item" can drift together. Use **Task** only for actionable work inside an **Idea** and **Roadmap Item** only for roadmap-level scope.
- "`Idea.is_merge`" conflicts with the domain language if it implies an **Idea** converts into a **Merge**. Say a **Task** converts into a **Merge** unless the schema is changed to model **Idea** conversion directly.
- "done" can mean different rollup levels. A **SubTask** is the atomic completion unit, a **Task** is done when all **SubTasks** are done, and an **Idea** is done when all **Tasks** are done.
