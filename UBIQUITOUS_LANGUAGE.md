# Ubiquitous Language

## Core lifecycle

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **FurrowDev** | A cloud-hosted git platform built around realtime, agent-native project development. | App, tool, dashboard |
| **Concept Project** | The entry-point project state where a new idea is discovered and shaped with an agent. | Draft project, idea, proposal |
| **Project** | A full project that has graduated from a **Concept Project**. | Repo, final concept, workspace |
| **Graduation** | The state change where a **Concept Project** becomes a **Project**. | Promotion, conversion, publish |
| **Discovery Flow** | The staged agent conversation that shapes a **Concept Project** before **Graduation**. (new) | Onboarding, intake, setup flow |

## Discovery flow

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Stage** | One named step inside the **Discovery Flow**. (new) | Step, phase, screen |
| **What Stage** | The **Stage** where the **Agent** learns what the project is about. (new) | Idea stage, concept stage |
| **For Whom Stage** | The **Stage** where the **Agent** learns the target audience and expected scale. (new) | Audience stage, user stage |
| **How Stage** | The **Stage** where the **Agent** learns the high-level technical shape and constraints. (new) | Technical stage, implementation stage |
| **Setup Stage** | The terminal **Stage** that follows discovery and precedes scaffolding work. (new) | Build stage, next step |
| **Stage Summary** | The persisted understanding captured at the end of a **Stage**. (new) | Notes, recap, conclusion |
| **What Summary** | The **Stage Summary** for the **What Stage**. (new) | Concept summary |
| **For Whom Summary** | The **Stage Summary** for the **For Whom Stage**. (new) | Audience summary |
| **How Summary** | The **Stage Summary** for the **How Stage**. (new) | Technical summary |

## Discovery artifacts

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Chat** | The conversation attached to one **Concept Project**. (updated) | Thread, prompt |
| **Transcript** | The ordered history of all **Messages** in a **Chat**. (new) | Chat log, history dump |
| **Message** | A single entry in a **Chat** written by a **User** or an **Agent**. | Comment, line, event |
| **Name** | The canonical title of a **Concept Project** or **Project**. | Label, slug, heading |
| **Description** | The short narrative summary of a **Concept Project** or **Project**. | Notes, body, overview |
| **Roadmap** | The structured plan attached to a **Concept Project** and organized into versioned milestones. (updated) | Plan, checklist, task list |
| **Roadmap Item** | A single scoped item within a **Roadmap**. | Task, step, ticket |
| **Roadmap Version** | A numbered milestone inside a **Roadmap** identified by `major.minor`. (new) | Milestone number, version node |
| **Current Roadmap Version** | The persisted **Roadmap Version** that represents the latest active milestone in a **Roadmap**. (new) | Latest version, active milestone |
| **Version Trail** | The ordered visual sequence of **Roadmap Versions** shown in the concept project experience. (new) | Timeline, roadmap strip |
| **Generated Name Ideas** | A temporary list of candidate **Names** proposed inside **Concept Project Settings**. (new) | Suggestions, options, alternates |
| **Generated Description** | The current persisted **Description** shown in **Concept Project Settings**. (new) | Summary text, project blurb |

## Management

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Concept Project Settings** | The dialog where a **User** can manage metadata for a **Concept Project**. (new) | Preferences, config, edit modal |
| **Delete Concept Project** | The irreversible action that removes a **Concept Project** and its dependent records. (new) | Remove project, archive, close |

## Roadmap interface

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Roadmap Rail** | The fixed top-of-screen UI that displays the **Version Trail** for a **Concept Project**. (new) | Sticky header, timeline bar, roadmap parent |
| **Roadmap Node** | One visual card in the **Roadmap Rail** representing a single **Roadmap Version**. (new) | Box, item card, milestone card |
| **Collapsed Rail** | The compact **Roadmap Rail** state that shows version numbers only. (new) | Minimized rail, compressed timeline |
| **Expanded Rail** | The detailed **Roadmap Rail** state that shows version numbers and short labels. (new) | Open rail, full timeline |

## Actors

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **User** | The authenticated person who creates and owns work in FurrowDev. | Account, person, customer |
| **Agent** | The system participant that helps discover a project and generates initial project artifacts. | Bot, assistant, AI |
| **Organisation** | A group owner that can own a **Concept Project** or **Project** instead of a single **User**. | Team, workspace, company |

## Relationships

- A **User** creates a **Concept Project**.
- An **Organisation** may own a **Concept Project** or **Project** in place of a **User**.
- A **Concept Project** moves through the **What Stage**, **For Whom Stage**, **How Stage**, and **Setup Stage** in order.
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
- The **Roadmap Rail** renders the **Version Trail** for a **Roadmap**.
- Each **Roadmap Node** represents exactly one **Roadmap Version**.
- A **Concept Project** can graduate into at most one **Project**.
- A **Project** may originate from exactly one **Concept Project**.
- **Generated Name Ideas** belong to **Concept Project Settings** and do not change the persisted **Name** until the **User** saves.
- **Delete Concept Project** removes the **Concept Project**, its **Chat**, its **Transcript**, and its generated **Roadmap**.

## Example dialogue

> **Dev:** "When a **User** opens a new **Concept Project**, where does discovery begin?"
> **Domain expert:** "In the **What Stage** of the **Discovery Flow**, inside the project’s **Chat**."
> **Dev:** "What gets persisted as the conversation moves forward?"
> **Domain expert:** "Each **Stage** produces a **Stage Summary**, and the **Concept Project** keeps its **Name**, **Description**, and **Roadmap** up to date."
> **Dev:** "What happens in **Concept Project Settings** when the user generates names?"
> **Domain expert:** "They get **Generated Name Ideas**, but the persisted **Name** only changes after save."
> **Dev:** "How should the roadmap appear at the top of the page?"
> **Domain expert:** "Use a **Roadmap Rail** that shows the **Version Trail**, where each **Roadmap Node** represents one **Roadmap Version** and the **Current Roadmap Version** is highlighted."
> **Dev:** "And if they choose **Delete Concept Project**?"
> **Domain expert:** "That permanently removes the **Concept Project** and its dependent records. It cannot be reverted."

## Flagged ambiguities

- "project" was used loosely to mean both **Concept Project** and **Project**. Use **Concept Project** for the pre-graduation state and **Project** only after **Graduation**.
- "chat", "message", and "transcript" are related but distinct. A **Chat** is the container, a **Message** is one item, and a **Transcript** is the ordered history view.
- "roadmap" and "roadmap item" are related but distinct. A **Roadmap** is the whole plan; a **Roadmap Item** is one unit within that plan.
- "roadmap version", "stage", and "milestone" can drift together. Use **Stage** for discovery flow progress and **Roadmap Version** for numbered roadmap progression.
- "rail", "trail", and "timeline" were used interchangeably. Use **Roadmap Rail** for the fixed UI container and **Version Trail** for the ordered version sequence it displays.
- "user", "account", and "person" can drift together. Use **User** for the authenticated actor in the product.
- "settings" can drift into generic UI language. Use **Concept Project Settings** for the dialog tied to one **Concept Project**.
- "suggestions", "ideas", and "names" were used interchangeably. Use **Generated Name Ideas** for temporary suggestions and **Name** for the persisted project title.
- "delete", "remove", and "archive" are not equivalent. Use **Delete Concept Project** only for the irreversible destructive action.
