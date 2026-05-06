# Ethara Teams Database Schema

## Core Models
- `User`: authentication identity, global role, profile, username, password hash, projects, assignments, comments, notifications.
- `Project`: tenant boundary, owner, membership, tasks, soft deletion.
- `ProjectMember`: role and membership state for a user in a project.
- `Task`: project-scoped work item with Kanban status, priority, assignment, order, metadata, and soft deletion.
- `Comment`: task-level chat message.
- `Notification`: persisted mention, assignment, status-change, and comment notifications.

## Auth Models
NextAuth uses `Account`, `Session`, and `VerificationToken` models with Prisma Adapter compatibility.

## Performance Indexes
- `Task.projectId`
- `Task.assignedToId`
- `Task.projectId, status, order`
- `Task.projectId, deletedAt`
- `ProjectMember.projectId`
- `ProjectMember.userId`
- `Comment.taskId`
- `Notification.userId`

## Data Isolation
Project membership is the project-tenant boundary. All task, comment, notification, and analytics services validate membership before querying scoped data.
