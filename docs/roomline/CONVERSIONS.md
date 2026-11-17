# Document conversion

Office and Keynote uploads use the real `convertDocumentVersion` implementation in `ee/features/conversions/lib/trigger/convert-files.ts`. `ROOMLINE_PROCESSING_MODE=inline` runs the real bounded PDF renderer and conversion directly, including in production on Railway; it does not enable local email capture or change authentication. `ROOMLINE_PROCESSING_MODE=trigger` uses the existing Trigger.dev task IDs `convert-files-to-pdf` and `convert-keynote-to-pdf`. If the variable is unset, the strict development local integration mode retains direct processing and other environments use Trigger. Any other value fails explicitly. Document uploads, new versions, and agreement uploads use this selection.

## Provider configuration

Configure complete, operator-controlled endpoints:

- `ROOMLINE_OFFICE_CONVERSION_URL`: Office-to-PDF endpoint.
- `ROOMLINE_OFFICE_CONVERSION_TOKEN`: optional bearer credential for that endpoint.
- `ROOMLINE_KEYNOTE_CONVERSION_URL`: separate endpoint with actual Keynote support.
- `ROOMLINE_KEYNOTE_CONVERSION_TOKEN`: optional bearer credential for that endpoint.

Each endpoint receives an HTTP POST with a multipart file field named `files` and must return PDF bytes. The Office request shape is compatible with a Gotenberg LibreOffice conversion endpoint such as `/forms/libreoffice/convert` for formats supported by that deployment. This adapter does not install or run a converter. Do not point Keynote at a service that cannot process Keynote. Redirects are rejected, requests time out after two minutes, and input/output are bounded to 100 MiB each. Missing configuration fails explicitly before downloading the source; there is no placeholder PDF fallback.

## Storage and processing

The implementation looks up the persisted version by team, document, and version, validates S3 team prefixes or the legacy Vercel Blob origin, downloads the source, parses the provider's PDF, and stores it through the existing team S3 transport. Original bytes remain downloadable. A legacy Blob original migrates to the same S3 transport because versions have a single storage-type field for both original and converted files. A transaction updates the version and the document only when that version remains primary. Concurrent file replacement fails rather than overwriting the changed version.

PDF page generation is awaited after the update. Trigger mode uses the existing PDF Trigger task. Inline mode uses `renderPdfVersion`, with that renderer's separate 20 MiB/100-page bounds. The 100 MiB HTTP transfer allowance does not raise the renderer's limit: a larger returned PDF can pass transport validation but fail page generation. A retry of an already converted version resumes page generation rather than converting again. Successful conversion requires configured storage and either a working Trigger runtime or inline processing. Inline mode does not supply a video processor or a substitute for other background workers.

## Verification limits

As of 17 November 2026, tests cover real local HTTP multipart transport using a PDF fixture response, provider failures, non-PDF responses, transfer bounds, team/version/storage scope, and invalid payloads. The HTTP test server does not convert an Office document. Real local PDF upload/rendering is separate evidence and does not prove Office or Keynote conversion. A deployment must verify its configured Office and Keynote services with actual input files; no provider conversion or production worker success is implied by the adapter tests. Hosted Railway verification remains pending deployment approval. See [the current runtime report](../../artifacts/runtime/README.md) for the latest completed checks and pending reruns.

The unused facades `pages/api/jobs/send-conversation-mention-notification.ts` and `pages/api/teams/[teamId]/datarooms/[id]/questions/[[...questions]].ts` were removed while resolving missing modules. Their implementations, dispatchers, and frontend consumers were absent from this repository. Existing conversations, messages, and FAQs retain their routes. This does not establish support for mentions or admin-authored question fan-out.
