# Roadmap

## Roadmap artifacts

| Term                        | Definition                                                                                                  | Aliases to avoid                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Roadmap**                 | The structured plan attached to a **Concept Project** and organized into versioned milestones.              | Plan, checklist, task list        |
| **Roadmap Item**            | A high-level scoped capability or milestone item within a **Roadmap**.                                      | Task, step, ticket                |
| **Roadmap Version**         | A numbered milestone inside a **Roadmap** identified by `major.minor`.                                      | Milestone number, version node    |
| **Current Roadmap Version** | The persisted **Roadmap Version** that represents the latest active milestone in a **Roadmap**.             | Latest version, active milestone  |
| **Setup Roadmap**           | The `v0.0` slice of the **Roadmap** that contains bootstrap and tooling tasks rather than product features. | Bootstrap plan, install checklist |
| **Version Trail**           | The ordered visual sequence of **Roadmap Versions** shown in the concept project experience.                | Timeline, roadmap strip           |

## Roadmap interface

| Term               | Definition                                                                                | Aliases to avoid                            |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Roadmap Rail**   | The fixed top-of-screen UI that displays the **Version Trail** for a **Concept Project**. | Sticky header, timeline bar, roadmap parent |
| **Roadmap Node**   | One visual card in the **Roadmap Rail** representing a single **Roadmap Version**.        | Box, item card, milestone card              |
| **Collapsed Rail** | The compact **Roadmap Rail** state that shows version numbers only.                       | Minimized rail, compressed timeline         |
| **Expanded Rail**  | The detailed **Roadmap Rail** state that shows version numbers and short labels.          | Open rail, full timeline                    |

## Relationships

- A **Concept Project** may have one **Roadmap**.
- A **Roadmap** contains zero or more **Roadmap Items**.
- A **Roadmap** contains one or more **Roadmap Versions** when it has versioned content.
- A **Roadmap Version** contains one or more **Roadmap Items**.
- A **Roadmap** has at most one **Current Roadmap Version** at a time.
- The **Setup Roadmap** is always the `v0.0` portion of a **Roadmap**.
- The **Roadmap Rail** renders the **Version Trail** for a **Roadmap**.
- Each **Roadmap Node** represents exactly one **Roadmap Version**.

## Flagged ambiguities

- "roadmap" and "roadmap item" are related but distinct. A **Roadmap** is the whole plan; a **Roadmap Item** is high-level roadmap scope, not executable **Task** work.
- "setup roadmap", "setup plan", and "v0.0 tasks" can drift together. Use **Setup Roadmap** for the bootstrap-focused `v0.0` roadmap slice.
- "roadmap version", "stage", and "milestone" can drift together. Use **Stage** for discovery flow progress and **Roadmap Version** for numbered roadmap progression.
- "rail", "trail", and "timeline" were used interchangeably. Use **Roadmap Rail** for the fixed UI container and **Version Trail** for the ordered version sequence it displays.
