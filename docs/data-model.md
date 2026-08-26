# Data model

All tables are organization-scoped either directly or through their event/match relationship.

| Table | Purpose |
| --- | --- |
| `profiles` | Auth user display name; populated by trigger on signup. |
| `organizations`, `organization_members` | Tenant boundary and durable role authority. |
| `events`, `teams`, `event_teams`, `matches` | TBA-backed competition schedule and participants. |
| `scouting_assignments` | The team/match form each scout is responsible for. |
| `form_definitions` | Versioned, editable JSON form schema. |
| `match_submissions` | The permanent client-generated UUID and JSON payload. |
| `submission_photos` | Metadata for private storage objects. |

`match_submissions.id` is never regenerated. It is the primary key, has no server default, and is inserted once by the browser. A retry receiving a duplicate key is proof the original was accepted; clients must not create a replacement submission.

`assignment_id` has a unique constraint so a single assignment cannot silently receive duplicate submissions. Corrections increment the revision and preserve the original submission ID.

Private photo object names are `submission-id/filename`. The storage bucket is never public; a signed URL is created only after the corresponding submission passes RLS.
