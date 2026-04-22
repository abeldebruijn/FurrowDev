<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into FurrowDev. PostHog is initialized client-side via `instrumentation-client.ts` (Next.js 15.3+ pattern), with a reverse proxy configured through `/ingest` in `next.config.ts` to improve reliability. Server-side events use `posthog-node` via a shared `lib/posthog-server.ts` helper. Users are identified on every page load using their internal viewer ID (`viewer.id`) via a `PostHogIdentify` client component rendered in the root layout, ensuring client and server events can be correlated. Error tracking is enabled globally via `capture_exceptions: true` and supplemented with explicit `posthog.captureException()` calls around critical failure paths.

| Event                              | Description                                                   | File                                                                |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `concept_project_created`          | User creates a new concept project (top of conversion funnel) | `app/actions/concept-projects.ts`                                   |
| `concept_project_message_sent`     | User sends a message during concept project discovery         | `components/concept-project/concept-project-discovery.tsx`          |
| `concept_project_stage_changed`    | User switches to a different discovery stage                  | `components/concept-project/concept-project-discovery.tsx`          |
| `concept_project_grill_me_entered` | User enters the grill_me stage to stress-test the setup plan  | `components/concept-project/concept-project-post-setup-actions.tsx` |
| `concept_project_graduated`        | Concept project graduates to a real project (key conversion)  | `app/api/concept-project/[concept-project-id]/graduate/route.ts`    |
| `vision_created`                   | User creates a new vision within a project                    | `app/api/project/[project-id]/ideas/route.ts`                       |
| `vision_message_sent`              | User sends a message in a vision workspace                    | `components/vision/vision-workspace.tsx`                            |
| `vision_collaborator_added`        | Owner adds a collaborator to a vision                         | `components/vision/vision-workspace.tsx`                            |
| `vision_collaborator_removed`      | Owner removes a collaborator from a vision                    | `components/vision/vision-workspace.tsx`                            |
| `project_settings_saved`           | User saves updated settings for a real project                | `components/project/project-settings.tsx`                           |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/164148/dashboard/636584
- **Concept project conversion funnel**: https://eu.posthog.com/project/164148/insights/SPpzp878
- **Concept project creation trend**: https://eu.posthog.com/project/164148/insights/pjxjWIyv
- **Vision creation trend**: https://eu.posthog.com/project/164148/insights/rtWlUCLG
- **Concept project stage drop-off**: https://eu.posthog.com/project/164148/insights/zoz7zC15
- **Daily active users (AI chat engagement)**: https://eu.posthog.com/project/164148/insights/Qe5BKt3P

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
