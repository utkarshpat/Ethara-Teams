# Ethara Teams Observability

## Logging Strategy
Ethara Teams emits structured JSON logs through `src/lib/logger.ts`. Logs are written to stdout/stderr so Railway can collect them automatically.

## Logged Events
- `request.received`: emitted from `src/proxy.ts` with request ID, method, and path.
- `auth.credentials_success`, `auth.credentials_invalid_password`, `auth.register_success`: authentication lifecycle events.
- `project.created`, `project.member_upserted`, `project.soft_deleted`: project administration events.
- `task.created`, `task.updated`, `task.soft_deleted`: task execution events.
- `comment.created`: task-thread collaboration events with mention count.
- `project_message.created`: project-wide collaboration events with mention and task reference counts.
- `notification.created`, `notification.read_state_updated`: notification lifecycle events.
- `analytics.project_loaded`: dashboard analytics reads.
- `realtime.server_ready`, `realtime.connected`, `realtime.project_joined`, `realtime.task_joined`: Socket.IO lifecycle and room authorization events.
- `api.app_error`, `api.validation_error`, `api.unexpected_error`: API failure paths.

## Security
The logger recursively redacts keys containing password, secret, token, key, authorization, or cookie before writing logs.

## Railway Usage
Open the Railway service logs to inspect JSON events. Filter by `event`, `requestId`, `userId`, `projectId`, or `taskId`.
