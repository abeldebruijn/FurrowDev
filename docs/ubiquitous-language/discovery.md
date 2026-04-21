# Discovery

## Core lifecycle

| Term                 | Definition                                                                                                              | Aliases to avoid                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **FurrowDev**        | A cloud-hosted git platform built around realtime, agent-native project development.                                    | App, tool, dashboard             |
| **Concept Project**  | The entry-point project state where a new idea is discovered and shaped with an agent.                                  | Draft project, idea, proposal    |
| **Project**          | A full project that has graduated from a **Concept Project**.                                                           | Repo, final concept, workspace   |
| **Graduation**       | The state change where a **Concept Project** becomes a **Project** and the original concept becomes a read-only record. | Promotion, conversion, publish   |
| **Discovery Flow**   | The staged agent conversation that shapes a **Concept Project** before **Graduation**.                                  | Onboarding, intake, setup flow   |
| **Discovery Record** | The archived read-only **Concept Project** preserved after **Graduation**.                                              | Archive, old draft, concept copy |

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

| Term                      | Definition                                                                            | Aliases to avoid                 |
| ------------------------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| **Name**                  | The canonical title of a **Concept Project** or **Project**.                          | Label, slug, heading             |
| **Description**           | The short narrative summary of a **Concept Project** or **Project**.                  | Notes, body, overview            |
| **Generated Name Ideas**  | A temporary list of candidate **Names** proposed inside **Concept Project Settings**. | Suggestions, options, alternates |
| **Generated Description** | The current persisted **Description** shown in **Concept Project Settings**.          | Summary text, project blurb      |

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

## Relationships

- A **Concept Project** moves through the **What Stage**, **For Whom Stage**, **How Stage**, and **Setup Stage** in order.
- A **Concept Project** may enter the **Grill Me Stage** only after the **Setup Stage** has been understood.
- A **Concept Project** has exactly one **Chat**.
- Each discovery **Stage** can produce exactly one persisted **Stage Summary**.
- A **Concept Project** may have one **Roadmap**.
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
- "vision", "idea", and "concept" can drift together. Use **Vision** for the private pre-sharing conversation, **Idea** for the later shared artifact, and **Concept Project** only for the separate staged discovery flow that creates a **Project**.
- "archive", "read-only concept", and "discovery record" were used for the same post-graduation artifact. Use **Discovery Record** for the preserved concept after **Graduation**.
- "grill me" can refer to either a button or a stage. Use **Grill Me** for the action and **Grill Me Stage** for the persisted stage.
- "settings" can drift into generic UI language. Use **Concept Project Settings** for the dialog tied to one **Concept Project**.
- "suggestions", "ideas", and "names" were used interchangeably. Use **Generated Name Ideas** for temporary suggestions and **Name** for the persisted project title.
- "delete", "remove", and "archive" are not equivalent. Use **Delete Concept Project** only for the irreversible destructive action.
