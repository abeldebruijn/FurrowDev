# Ubiquitous Language

## Core lifecycle

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **FurrowDev** | A cloud-hosted git platform built around realtime, agent-native project development. | App, tool, dashboard |
| **Concept Project** | The entry-point project state where a new idea is discovered and shaped with an agent. | Draft project, idea, proposal |
| **Project** | A full project that has graduated from a **Concept Project**. | Repo, final concept, workspace |
| **Graduation** | The state change where a **Concept Project** becomes a **Project**. | Promotion, conversion, publish |

## Discovery artifacts

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Chat** | The conversation attached to one **Concept Project**. | Thread, messages, prompt |
| **Message** | A single entry in a **Chat** written by a **User** or an **Agent**. | Comment, line, event |
| **Name** | The canonical title of a **Concept Project** or **Project**. | Label, slug, heading |
| **Description** | The short narrative summary of a **Concept Project** or **Project**. | Notes, body, overview |
| **Roadmap** | The structured plan attached to a **Concept Project** and used to shape its future work. | Plan, checklist, task list |
| **Roadmap Item** | A single scoped item within a **Roadmap**. | Task, step, ticket |

## Actors

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **User** | The authenticated person who creates and owns work in FurrowDev. | Account, person, customer |
| **Agent** | The system participant that helps discover a project and generates initial project artifacts. | Bot, assistant, AI |
| **Organisation** | A group owner that can own a **Concept Project** or **Project** instead of a single **User**. | Team, workspace, company |

## Relationships

- A **User** creates a **Concept Project**.
- An **Organisation** may own a **Concept Project** or **Project** in place of a **User**.
- A **Concept Project** has exactly one **Chat**.
- A **Chat** contains one or more **Messages** over time.
- An **Agent** and a **User** both author **Messages** in a **Chat**.
- A **Concept Project** may have one **Roadmap**.
- A **Roadmap** contains zero or more **Roadmap Items**.
- A **Concept Project** can graduate into at most one **Project**.
- A **Project** may originate from exactly one **Concept Project**.

## Example dialogue

> **Dev:** "When a **User** starts something new in FurrowDev, do they create a **Project** directly?"
> **Domain expert:** "No. Every new effort starts as a **Concept Project**."
> **Dev:** "What exists inside a **Concept Project** before it graduates?"
> **Domain expert:** "A **Chat**, plus the generated **Name**, **Description**, and initial **Roadmap**."
> **Dev:** "So the **Project** only exists after **Graduation**?"
> **Domain expert:** "Exactly. The **Concept Project** is discovery; the **Project** is the graduated result."

## Flagged ambiguities

- "project" was used loosely to mean both **Concept Project** and **Project**. Use **Concept Project** for the pre-graduation state and **Project** only after **Graduation**.
- "chat" and "message" are related but distinct. A **Chat** is the container; a **Message** is one item inside it.
- "roadmap" and "roadmap item" are related but distinct. A **Roadmap** is the whole plan; a **Roadmap Item** is one unit within that plan.
- "user", "account", and "person" can drift together. Use **User** for the authenticated actor in the product.
