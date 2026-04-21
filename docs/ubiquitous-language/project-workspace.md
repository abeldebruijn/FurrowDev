# Project Workspace

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

## Flagged ambiguities

- "widget", "widget variant", and "placed widget" are related but distinct. Use **Widget** for the dashboard module, **Widget Variant** for the draggable size-specific option, and **Placed Widget** once it has been added to the **Widget Layout**.
- "layout", "board", and "grid" were used interchangeably. Use **Widget Layout** for the arranged widget state and **Drop Zone** for the visible area that accepts drops.
- "preview", "ghost", and "slot" were used for the same temporary indicator. Use **Placement Preview** for the pre-drop visual position marker.
- "delete button", "trash", and "remove target" were used for different deletion mechanisms. Use **Delete Drop Target** for drag-to-delete and **Inline Delete** for the per-widget circular action.
- "edit mode", "widget edit", and "builder mode" were used interchangeably. Use **Edit Mode** for the URL-driven project state where widget layout editing is allowed.
- "temporary layout", "client state", and "session-only layout" were used for the same non-persisted concept. Use **Temporary Layout**.
