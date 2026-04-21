# Actors and Ownership

## Actors

| Term             | Definition                                                                                    | Aliases to avoid          |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------- |
| **User**         | The authenticated person who creates and owns work in FurrowDev.                              | Account, person, customer |
| **Agent**        | The system participant that helps discover a project and generates initial project artifacts. | Bot, assistant, AI        |
| **Organisation** | A group owner that can own a **Concept Project** or **Project** instead of a single **User**. | Team, workspace, company  |

## Relationships

- A **User** creates a **Concept Project**.
- An **Organisation** may own a **Concept Project** or **Project** in place of a **User**.
- An **Agent** and a **User** both author **Messages** in a **Chat**.

## Flagged ambiguities

- "user", "account", and "person" can drift together. Use **User** for the authenticated actor in the product.
