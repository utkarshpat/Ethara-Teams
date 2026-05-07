"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { TaskStatus } from "@prisma/client";
import { CalendarClock, LockKeyhole, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardTask } from "@/modules/dashboard/types";
import { useUiStore } from "@/stores/ui-store";

const columns: Array<{ id: TaskStatus; title: string; accent: string }> = [
  { id: "TODO", title: "Todo", accent: "border-t-primary" },
  { id: "IN_PROGRESS", title: "In Progress", accent: "border-t-sky-400" },
  { id: "REVIEW", title: "Review", accent: "border-t-[#7e22ce]" },
  { id: "DONE", title: "Done", accent: "border-t-emerald-400" },
];

type KanbanBoardProps = {
  tasks: DashboardTask[];
  onReorder: (tasks: DashboardTask[]) => void;
  onMove: (taskId: string, status: TaskStatus, order: number) => void;
  canMoveTask: (task: DashboardTask) => boolean;
  onDeniedMove: () => void;
};

function priorityVariant(priority: DashboardTask["priority"]) {
  if (priority === "URGENT") {
    return "destructive";
  }

  if (priority === "HIGH") {
    return "default";
  }

  return "secondary";
}

function reorderTasks(
  tasks: DashboardTask[],
  result: DropResult,
): DashboardTask[] {
  if (!result.destination) {
    return tasks;
  }

  const moving = tasks.find((task) => task.id === result.draggableId);

  if (!moving) {
    return tasks;
  }

  const destinationStatus = result.destination.droppableId as TaskStatus;
  const withoutMoving = tasks.filter((task) => task.id !== moving.id);
  const destinationTasks = withoutMoving
    .filter((task) => task.status === destinationStatus)
    .sort((a, b) => a.order - b.order);

  destinationTasks.splice(result.destination.index, 0, {
    ...moving,
    status: destinationStatus,
  });

  return withoutMoving
    .filter((task) => task.status !== destinationStatus)
    .concat(
      destinationTasks.map((task, index) => ({
        ...task,
        order: index,
      })),
    );
}

export function KanbanBoard({
  tasks,
  onReorder,
  onMove,
  canMoveTask,
  onDeniedMove,
}: KanbanBoardProps) {
  const setSelectedTaskId = useUiStore((state) => state.setSelectedTaskId);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }

    const sourceTask = tasks.find((task) => task.id === result.draggableId);

    if (!sourceTask || !canMoveTask(sourceTask)) {
      onDeniedMove();
      return;
    }

    const nextTasks = reorderTasks(tasks, result);
    const moved = nextTasks.find((task) => task.id === result.draggableId);

    if (!moved) {
      return;
    }

    onReorder(nextTasks);
    onMove(moved.id, moved.status, moved.order);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-h-[620px] min-w-[920px] grid-cols-4 gap-3 xl:gap-4">
          {columns.map((column) => {
            const columnTasks = tasks
              .filter((task) => task.status === column.id)
              .sort((a, b) => a.order - b.order);

            return (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided, snapshot) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex min-h-[340px] flex-col gap-3 rounded-2xl border border-border border-t-[3px] bg-card/20 p-3 backdrop-blur-md transition-all xl:p-4",
                      column.accent,
                      snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/40",
                    )}
                  >
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-sm font-semibold tracking-normal">
                        {column.title}
                      </h2>
                      <Badge variant="secondary">{columnTasks.length}</Badge>
                    </div>
                    <div className="flex flex-1 flex-col gap-3">
                      {columnTasks.map((task, index) => {
                        const canMove = canMoveTask(task);

                        return (
                          <Draggable
                            draggableId={task.id}
                            index={index}
                            isDragDisabled={!canMove}
                            key={task.id}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <Card
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={cn(
                                  "rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
                                  dragSnapshot.isDragging &&
                                    "rotate-2 scale-105 border-primary/50 shadow-xl",
                                  !canMove && "bg-muted/50 opacity-80",
                                )}
                              >
                                <CardContent className="flex flex-col gap-4 p-4">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <h3 className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 tracking-normal">
                                        {task.title}
                                      </h3>
                                      <Badge
                                        variant={priorityVariant(task.priority)}
                                        className="shrink-0"
                                      >
                                        {task.priority}
                                      </Badge>
                                    </div>
                                    <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                                      {task.description ?? "No description"}
                                    </p>
                                    {!canMove ? (
                                      <Badge variant="outline" className="w-fit gap-1">
                                        <LockKeyhole />
                                        Read only
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    {task.dueDate ? (
                                      <span className="inline-flex items-center gap-1">
                                        <CalendarClock />
                                        {new Intl.DateTimeFormat("en", {
                                          month: "short",
                                          day: "numeric",
                                        }).format(new Date(task.dueDate))}
                                      </span>
                                    ) : null}
                                    <span className="inline-flex items-center gap-1">
                                      <MessageSquare />
                                      {task.commentsCount}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 truncate text-xs text-muted-foreground">
                                      {task.assignedTo?.name ?? "Unassigned"}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedTaskId(task.id)}
                                    >
                                      Open
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </section>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
