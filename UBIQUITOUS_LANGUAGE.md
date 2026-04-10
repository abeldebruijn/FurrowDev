# Ubiquitous Language

## Core lifecycle

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **FurrowDev** | A cloud-hosted git platform built around realtime, agent-native project development. | App, tool, dashboard |
| **Concept Project** | The entry-point project state where a new idea is discovered and shaped with an agent. | Draft project, idea, proposal |
| **Project** | A full project that has graduated from a **Concept Project**. | Repo, final concept, workspace |
| **Graduation** | The state change where a **Concept Project** becomes a **Project** and the original concept becomes a read-only record. (updated) | Promotion, conversion, publish |
| **Discovery Flow** | The staged agent conversation that shapes a **Concept Project** before **Graduation**. (new) | Onboarding, intake, setup flow |
| **Discovery Record** | The archived read-only **Concept Project** preserved after **Graduation**. (new) | Archive, old draft, concept copy |

## Discovery flow

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Stage** | One named step inside the **Discovery Flow**. (new) | Step, phase, screen |
| **What Stage** | The **Stage** where the **Agent** learns what the project is about. (new) | Idea stage, concept stage |
| **For Whom Stage** | The **Stage** where the **Agent** learns the target audience and expected scale. (new) | Audience stage, user stage |
| **How Stage** | The **Stage** where the **Agent** learns the high-level technical shape and constraints. (new) | Technical stage, implementation stage |
| **Setup Stage** | The **Stage** where the bootstrap structure, stack, and core tooling are defined before optional pressure-testing or **Graduation**. (updated) | Build stage, next step |
| **Grill Me Stage** | The optional post-setup **Stage** where the plan is pressure-tested for missing assumptions, constraints, and tradeoffs. (new) | Review stage, challenge stage, QA stage |
| **Stage Summary** | The persisted understanding captured at the end of a **Stage**. (new) | Notes, recap, conclusion |
| **What Summary** | The **Stage Summary** for the **What Stage**. (new) | Concept summary |
| **For Whom Summary** | The **Stage Summary** for the **For Whom Stage**. (new) | Audience summary |
| **How Summary** | The **Stage Summary** for the **How Stage**. (new) | Technical summary |
| **Setup Summary** | The **Stage Summary** for the **Setup Stage** or a refined summary saved from the **Grill Me Stage**. (new) | Bootstrap notes, stack summary |

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
| **Setup Roadmap** | The `v0.0` slice of the **Roadmap** that contains bootstrap and tooling tasks rather than product features. (new) | Bootstrap plan, install checklist |
| **Version Trail** | The ordered visual sequence of **Roadmap Versions** shown in the concept project experience. (new) | Timeline, roadmap strip |
| **Generated Name Ideas** | A temporary list of candidate **Names** proposed inside **Concept Project Settings**. (new) | Suggestions, options, alternates |
| **Generated Description** | The current persisted **Description** shown in **Concept Project Settings**. (new) | Summary text, project blurb |

## Actions

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Grill Me** | The action that moves a **Concept Project** into the **Grill Me Stage** for deeper questioning. (new) | Review, inspect, challenge |
| **Graduate to Project** | The action that performs **Graduation** and creates the real **Project**. (new) | Finish, launch, convert button |

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
- The **Setup Roadmap** is always the `v0.0` portion of a **Roadmap**.
- The **Roadmap Rail** renders the **Version Trail** for a **Roadmap**.
- Each **Roadmap Node** represents exactly one **Roadmap Version**.
- A **Concept Project** can graduate into at most one **Project**.
- A **Project** may originate from exactly one **Concept Project**.
- **Grill Me** enters the **Grill Me Stage** without removing access to **Graduate to Project**.
- **Graduate to Project** creates the **Project** and leaves the original **Concept Project** behind as the **Discovery Record**.
- **Generated Name Ideas** belong to **Concept Project Settings** and do not change the persisted **Name** until the **User** saves.
- **Delete Concept Project** removes the **Concept Project**, its **Chat**, its **Transcript**, and its generated **Roadmap**.

## Example dialogue

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
- "archive", "read-only concept", and "discovery record" were used for the same post-graduation artifact. Use **Discovery Record** for the preserved concept after **Graduation**.
- "grill me" can refer to either a button or a stage. Use **Grill Me** for the action and **Grill Me Stage** for the persisted stage.
- "chat", "message", and "transcript" are related but distinct. A **Chat** is the container, a **Message** is one item, and a **Transcript** is the ordered history view.
- "roadmap" and "roadmap item" are related but distinct. A **Roadmap** is the whole plan; a **Roadmap Item** is one unit within that plan.
- "setup roadmap", "setup plan", and "v0.0 tasks" can drift together. Use **Setup Roadmap** for the bootstrap-focused `v0.0` roadmap slice.
- "roadmap version", "stage", and "milestone" can drift together. Use **Stage** for discovery flow progress and **Roadmap Version** for numbered roadmap progression.
- "rail", "trail", and "timeline" were used interchangeably. Use **Roadmap Rail** for the fixed UI container and **Version Trail** for the ordered version sequence it displays.
- "user", "account", and "person" can drift together. Use **User** for the authenticated actor in the product.
- "settings" can drift into generic UI language. Use **Concept Project Settings** for the dialog tied to one **Concept Project**.
- "suggestions", "ideas", and "names" were used interchangeably. Use **Generated Name Ideas** for temporary suggestions and **Name** for the persisted project title.
- "delete", "remove", and "archive" are not equivalent. Use **Delete Concept Project** only for the irreversible destructive action.
