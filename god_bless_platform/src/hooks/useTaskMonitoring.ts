/**
 * Task Monitoring Hook
 * Custom hook for real-time task monitoring with WebSocket and polling fallback
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, ApiClientError } from "../services/api";
import { useWebSocketSubscription } from "./useWebSocket";
import { WS_CHANNELS } from "../types/websocket";
import { API_ENDPOINTS, config } from "../config";
import { STORAGE_KEYS } from "../config/constants";
import type {
  Task,
  TaskError,
  TaskResult,
  TaskStatus,
  TaskType,
  ID,
} from "../types/models";
import type {
  TaskProgressMessage,
  TaskCompleteMessage,
  WebSocketMessage,
} from "../types/websocket";

type RawTaskPayload = Partial<Task> & {
  task_id?: ID;
  taskId?: ID;
  category?: TaskType;
  status?: string;
  current_step?: string;
  currentStep?: string;
  progressMessage?: string;
  progress?: number | string;
  result_data?: unknown;
  error_message?: unknown;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  duration?: number;
  user_id?: ID;
  project_id?: ID;
  task_args?: Record<string, unknown>;
  retry_count?: number;
  max_retries?: number;
  can_retry?: boolean;
};

const STATUS_MAP: Record<string, TaskStatus> = {
  pending: "pending",
  PENDING: "pending",
  started: "running",
  STARTED: "running",
  progress: "running",
  PROGRESS: "running",
  running: "running",
  RUNNING: "running",
  success: "completed",
  SUCCESS: "completed",
  completed: "completed",
  COMPLETED: "completed",
  failure: "failed",
  FAILURE: "failed",
  failed: "failed",
  FAILED: "failed",
  revoked: "cancelled",
  REVOKED: "cancelled",
  cancelled: "cancelled",
  CANCELLED: "cancelled",
  retry: "retrying",
  RETRY: "retrying",
  retrying: "retrying",
  RETRYING: "retrying",
};

function normalizeTaskStatus(status?: string | null): TaskStatus {
  if (!status) {
    return "pending";
  }
  return STATUS_MAP[status] || ((status.toLowerCase() as TaskStatus) ?? "pending");
}

function normalizeTimestamp(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || undefined;
  }
  return date.toISOString();
}

function getStoredUserId(): ID | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) {
      return undefined;
    }
    const user = JSON.parse(raw);
    return user?.user_id || user?.id || user?.userId || undefined;
  } catch (error) {
    console.warn("Failed to read stored user data for task monitoring", error);
    return undefined;
  }
}

function normalizeTaskResult(
  raw: unknown,
  status: TaskStatus,
  previous?: TaskResult
): TaskResult | undefined {
  if (!raw) {
    return previous;
  }

  if (typeof raw === "object" && raw !== null) {
    const result = raw as Record<string, any>;
    const success =
      typeof result.success === "boolean"
        ? result.success
        : status === "completed";
    const message =
      typeof result.message === "string" && result.message.length > 0
        ? result.message
        : previous?.message || (status === "completed" ? "Task completed successfully" : "");

    let statistics = result.statistics ?? previous?.statistics;
    if (!statistics) {
      const hasStatsFields =
        [
          "itemsTotal",
          "itemsProcessed",
          "successCount",
          "errorCount",
          "warningCount",
          "duration",
          "totalItems",
          "processedItems",
          "successfulItems",
          "failedItems",
        ].some((key) => key in result);

      if (hasStatsFields) {
        statistics = {
          totalItems:
            result.totalItems ??
            result.itemsTotal ??
            previous?.statistics?.totalItems ??
            0,
          processedItems:
            result.processedItems ??
            result.itemsProcessed ??
            previous?.statistics?.processedItems ??
            0,
          successfulItems:
            result.successfulItems ??
            result.successCount ??
            previous?.statistics?.successfulItems ??
            0,
          failedItems:
            result.failedItems ??
            result.errorCount ??
            previous?.statistics?.failedItems ??
            0,
          skippedItems:
            result.skippedItems ??
            result.warningCount ??
            previous?.statistics?.skippedItems ??
            0,
          duration:
            result.duration ??
            previous?.statistics?.duration ??
            0,
        };
      }
    }

    return {
      success,
      message,
      data: result.data ?? raw,
      statistics,
      downloadUrl: result.downloadUrl ?? previous?.downloadUrl,
      warnings: result.warnings ?? previous?.warnings,
    };
  }

  if (typeof raw === "string") {
    return {
      success: status === "completed",
      message: raw,
      data: previous?.data,
      statistics: previous?.statistics,
      warnings: previous?.warnings,
      downloadUrl: previous?.downloadUrl,
    };
  }

  return previous;
}

function normalizeTaskError(raw: unknown, previous?: TaskError): TaskError | undefined {
  if (!raw) {
    return previous;
  }

  if (typeof raw === "object" && raw !== null && "message" in (raw as any)) {
    const errorObject = raw as Record<string, any>;
    return {
      code: String(errorObject.code || previous?.code || "TASK_ERROR"),
      message: String(errorObject.message ?? previous?.message ?? ""),
      details: errorObject.details ?? previous?.details,
      stackTrace: errorObject.stackTrace ?? previous?.stackTrace,
      retryable:
        typeof errorObject.retryable === "boolean"
          ? errorObject.retryable
          : previous?.retryable ?? false,
    };
  }

  if (typeof raw === "string") {
    return {
      code: previous?.code || "TASK_ERROR",
      message: raw,
      details: previous?.details,
      stackTrace: previous?.stackTrace,
      retryable: previous?.retryable ?? false,
    };
  }

  return previous;
}

function normalizeTaskPayload(
  payload: RawTaskPayload,
  previous?: Task | null,
  fallbackUserId?: ID
): Task | null {
  const resolvedId =
    (payload.id as ID) || payload.taskId || payload.task_id || previous?.id;

  if (!resolvedId) {
    return previous ?? null;
  }

  const resolvedStatus = normalizeTaskStatus(payload.status ?? previous?.status);
  const resolvedType =
    (payload.type as TaskType) ||
    (payload.category as TaskType) ||
    previous?.type ||
    "phone_generation";

  const progressValue =
    typeof payload.progress === "number"
      ? payload.progress
      : typeof payload.progress === "string"
      ? Number.parseFloat(payload.progress)
      : undefined;

  const createdAt =
    payload.createdAt || normalizeTimestamp(payload.created_at) || previous?.createdAt || new Date().toISOString();

  const startedAt =
    payload.startedAt || normalizeTimestamp(payload.started_at) || previous?.startedAt;

  const completedAt =
    payload.completedAt || normalizeTimestamp(payload.completed_at) || previous?.completedAt;

  let estimatedDuration = payload.estimatedDuration ?? previous?.estimatedDuration;
  if (estimatedDuration === undefined && payload.estimated_completion) {
    const estimate = new Date(payload.estimated_completion).getTime();
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    if (!Number.isNaN(estimate) && !Number.isNaN(start)) {
      estimatedDuration = Math.max(0, Math.round((estimate - start) / 1000));
    }
  }

  const actualDuration =
    payload.actualDuration ?? payload.duration ?? previous?.actualDuration;

  const result = normalizeTaskResult(
    (payload.result as unknown) ?? payload.result_data,
    resolvedStatus,
    previous?.result
  );

  const error = normalizeTaskError(
    payload.error ?? payload.error_message,
    previous?.error
  );

  const parameters =
    payload.parameters || payload.task_args || previous?.parameters || {};

  const retryCount =
    payload.retryCount ?? payload.retry_count ?? previous?.retryCount ?? 0;

  const maxRetries =
    payload.maxRetries ?? payload.max_retries ?? previous?.maxRetries ?? 3;

  const canRetry =
    payload.canRetry ??
    payload.can_retry ??
    previous?.canRetry ??
    resolvedStatus === "failed";

  return {
    id: resolvedId,
    type: resolvedType,
    status: resolvedStatus,
    progress: progressValue ?? previous?.progress ?? (resolvedStatus === "completed" ? 100 : 0),
    progressMessage:
      payload.progressMessage ??
      payload.currentStep ??
      payload.current_step ??
      previous?.progressMessage,
    result,
    error,
    createdAt,
    startedAt,
    completedAt,
    estimatedDuration,
    actualDuration,
    projectId: payload.projectId ?? payload.project_id ?? previous?.projectId,
    userId:
      payload.userId ??
      payload.user_id ??
      previous?.userId ??
      fallbackUserId ??
      "",
    parameters,
    retryCount,
    maxRetries,
    canRetry,
  };
}

interface TaskMonitoringState {
  tasks: Map<ID, Task>;
  activeTasks: Task[];
  completedTasks: Task[];
  failedTasks: Task[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface TaskMonitoringOptions {
  projectId?: ID;
  userId?: ID;
  taskTypes?: TaskType[];
  enablePolling?: boolean;
  pollingInterval?: number;
  maxCompletedTasks?: number;
}

/**
 * Hook for monitoring tasks in real-time
 */
export function useTaskMonitoring(options: TaskMonitoringOptions = {}) {
  const {
    projectId,
    userId,
    taskTypes,
    enablePolling = true,
    pollingInterval = 30000, // 30 seconds
    maxCompletedTasks = 50,
  } = options;

  const [state, setState] = useState<TaskMonitoringState>({
    tasks: new Map(),
    activeTasks: [],
    completedTasks: [],
    failedTasks: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  // WebSocket subscription for task progress updates
  useWebSocketSubscription<TaskProgressMessage>(
    WS_CHANNELS.TASK_PROGRESS,
    useCallback(
      (message: WebSocketMessage<TaskProgressMessage>) => {
        const fallbackUserId = userId ?? getStoredUserId();

        setState((prevState) => {
          const newTasks = new Map(prevState.tasks);
          const existingTask = newTasks.get(
            (message.data.taskId ?? message.data.task_id) as ID
          );

          const normalizedTask = normalizeTaskPayload(
            {
              ...message.data,
              id: (message.data.taskId ?? message.data.task_id) as ID,
              progressMessage:
                message.data.progressMessage ?? message.data.currentStep,
            },
            existingTask,
            fallbackUserId
          );

          if (!normalizedTask) {
            return prevState;
          }

          newTasks.set(normalizedTask.id, normalizedTask);

          const allTasks = Array.from(newTasks.values());
          const activeTasks = allTasks.filter((task) =>
            ["running", "pending", "retrying"].includes(task.status)
          );

          return {
            ...prevState,
            tasks: newTasks,
            activeTasks,
            lastUpdated: new Date().toISOString(),
          };
        });
      },
      [userId]
    ),
    {
      projectId,
      userId,
      messageTypes: ["task_progress"],
    },
    [projectId, userId]
  );

  // WebSocket subscription for task completion
  useWebSocketSubscription<TaskCompleteMessage>(
    WS_CHANNELS.TASK_COMPLETE,
    useCallback(
      (message: WebSocketMessage<TaskCompleteMessage>) => {
        const fallbackUserId = userId ?? getStoredUserId();

        setState((prevState) => {
          const newTasks = new Map(prevState.tasks);
          const existingTask = newTasks.get(
            (message.data.taskId ?? message.data.task_id) as ID
          );

          const normalizedTask = normalizeTaskPayload(
            {
              ...message.data,
              id: (message.data.taskId ?? message.data.task_id) as ID,
              result: message.data.result ?? message.data.finalStatistics,
            },
            existingTask,
            fallbackUserId
          );

          if (!normalizedTask) {
            return prevState;
          }

          const taskWithCompletion: Task = {
            ...normalizedTask,
            progress: 100,
            completedAt: normalizedTask.completedAt || new Date().toISOString(),
            actualDuration:
              normalizedTask.actualDuration ?? message.data.duration,
            result: normalizeTaskResult(
              message.data.result ?? normalizedTask.result,
              normalizedTask.status,
              normalizedTask.result
            ),
            error: normalizeTaskError(
              message.data.error ?? normalizedTask.error,
              normalizedTask.error
            ),
          };

          newTasks.set(taskWithCompletion.id, taskWithCompletion);

          const allTasks = Array.from(newTasks.values());
          const activeTasks = allTasks.filter((task) =>
            ["running", "pending", "retrying"].includes(task.status)
          );
          const completedTasks = allTasks
            .filter((task) => task.status === "completed")
            .sort(
              (a, b) =>
                new Date(b.completedAt || b.createdAt).getTime() -
                new Date(a.completedAt || a.createdAt).getTime()
            )
            .slice(0, maxCompletedTasks);
          const failedTasks = allTasks
            .filter((task) => task.status === "failed")
            .sort(
              (a, b) =>
                new Date(b.completedAt || b.createdAt).getTime() -
                new Date(a.completedAt || a.createdAt).getTime()
            )
            .slice(0, maxCompletedTasks);

          return {
            ...prevState,
            tasks: newTasks,
            activeTasks,
            completedTasks,
            failedTasks,
            lastUpdated: new Date().toISOString(),
          };
        });
      },
      [userId, maxCompletedTasks]
    ),
    {
      projectId,
      userId,
      messageTypes: ["task_complete", "task_error", "task_cancelled"],
    },
    [projectId, userId, maxCompletedTasks]
  );

  // Polling fallback for when WebSocket is not available
  const pollTasks = useCallback(async () => {
    if (isPollingRef.current) return;

    isPollingRef.current = true;

    try {
      const params: Record<string, unknown> = {};
      if (projectId) params.project_id = projectId;
      if (userId) params.user_id = userId;
      if (taskTypes?.length) params.task_types = taskTypes.join(",");

      console.log(
        "🔍 API Call Debug - Endpoint: /tasks/user/, Base URL:",
        config.apiUrl
      );
      const response = await apiClient.get<unknown[]>(
        API_ENDPOINTS.TASKS.USER,
        params
      );

      if (response.success) {
        setState((prevState) => {
          const fallbackUserId = userId ?? getStoredUserId();
          const newTasks = new Map<ID, Task>();

          const rawTasks = Array.isArray(response.data)
            ? (response.data as RawTaskPayload[])
            : [];

          rawTasks.forEach((rawTask) => {
            const rawId =
              (rawTask.task_id as ID) || rawTask.taskId || (rawTask.id as ID);
            const existingTask = rawId
              ? prevState.tasks.get(rawId)
              : undefined;

            const normalized = normalizeTaskPayload(
              { ...rawTask, id: rawId },
              existingTask,
              fallbackUserId
            );

            if (normalized) {
              newTasks.set(normalized.id, normalized);
            }
          });

          const allTasks = Array.from(newTasks.values());
          const activeTasks = allTasks.filter((task) =>
            ["running", "pending", "retrying"].includes(task.status)
          );
          const completedTasks = allTasks
            .filter((task) => task.status === "completed")
            .sort(
              (a, b) =>
                new Date(b.completedAt || b.createdAt).getTime() -
                new Date(a.completedAt || a.createdAt).getTime()
            )
            .slice(0, maxCompletedTasks);
          const failedTasks = allTasks
            .filter((task) => task.status === "failed")
            .sort(
              (a, b) =>
                new Date(b.completedAt || b.createdAt).getTime() -
                new Date(a.completedAt || a.createdAt).getTime()
            )
            .slice(0, maxCompletedTasks);

          return {
            ...prevState,
            tasks: newTasks,
            activeTasks,
            completedTasks,
            failedTasks,
            isLoading: false,
            error: null,
            lastUpdated: new Date().toISOString(),
          };
        });
      }
    } catch (error) {
      console.error("Failed to poll tasks:", error);
      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch tasks",
      }));
    } finally {
      isPollingRef.current = false;
    }
  }, [projectId, userId, taskTypes, maxCompletedTasks]);

  // Initial load and polling setup
  useEffect(() => {
    setState((prevState) => ({ ...prevState, isLoading: true }));
    pollTasks();

    if (enablePolling) {
      pollingIntervalRef.current = window.setInterval(
        pollTasks,
        pollingInterval
      );
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollTasks, enablePolling, pollingInterval]);

  // Get task by ID
  const getTask = useCallback(
    (taskId: ID): Task | undefined => {
      return state.tasks.get(taskId);
    },
    [state.tasks]
  );

  // Get tasks by status
  const getTasksByStatus = useCallback(
    (status: TaskStatus): Task[] => {
      return Array.from(state.tasks.values()).filter(
        (task) => task.status === status
      );
    },
    [state.tasks]
  );

  // Get tasks by type
  const getTasksByType = useCallback(
    (type: TaskType): Task[] => {
      return Array.from(state.tasks.values()).filter(
        (task) => task.type === type
      );
    },
    [state.tasks]
  );

  // Retry a failed task
  const retryTask = useCallback(async (taskId: ID): Promise<void> => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.TASKS.RETRY(taskId)
      );
      if (response.success) {
        // Task will be updated via WebSocket
        console.log(`Task ${taskId} retry initiated`);
      }
    } catch (error) {
      console.error(`Failed to retry task ${taskId}:`, error);
      throw error;
    }
  }, []);

  // Cancel a running task
  const cancelTask = useCallback(async (taskId: ID): Promise<void> => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.TASKS.CANCEL(taskId)
      );
      if (response.success) {
        // Task will be updated via WebSocket
        console.log(`Task ${taskId} cancellation initiated`);
      }
    } catch (error) {
      console.error(`Failed to cancel task ${taskId}:`, error);
      throw error;
    }
  }, []);

  // Refresh tasks manually
  const refreshTasks = useCallback(() => {
    setState((prevState) => ({ ...prevState, isLoading: true }));
    pollTasks();
  }, [pollTasks]);

  return {
    // State
    tasks: Array.from(state.tasks.values()),
    activeTasks: state.activeTasks,
    completedTasks: state.completedTasks,
    failedTasks: state.failedTasks,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Getters
    getTask,
    getTasksByStatus,
    getTasksByType,

    // Actions
    retryTask,
    cancelTask,
    refreshTasks,

    // Statistics
    totalTasks: state.tasks.size,
    activeTaskCount: state.activeTasks.length,
    completedTaskCount: state.completedTasks.length,
    failedTaskCount: state.failedTasks.length,
    successRate:
      state.tasks.size > 0
        ? (state.completedTasks.length /
            (state.completedTasks.length + state.failedTasks.length)) *
          100
        : 0,
  };
}

/**
 * Hook for monitoring a specific task
 */
interface UseTaskProgressOptions {
  pollInterval?: number;
}

const TERMINAL_STATUSES: TaskStatus[] = [
  "completed",
  "failed",
  "cancelled",
];

export function useTaskProgress(
  taskId?: ID | null,
  options: UseTaskProgressOptions = {}
) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastTaskIdRef = useRef<ID | null>(null);
  const initialFetchTimeoutRef = useRef<number | null>(null);
  const completionRefreshTimeoutRef = useRef<number | null>(null);

  const pollInterval = options.pollInterval ?? 5000;

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const mergeTaskUpdate = useCallback((update: RawTaskPayload) => {
    setTask((prevTask) => {
      const resolvedId =
        (update.id as ID) || update.taskId || update.task_id || prevTask?.id;

      const normalized = normalizeTaskPayload(
        {
          ...update,
          id: resolvedId as ID,
        },
        prevTask ?? undefined,
        update.user_id ?? update.userId ?? prevTask?.userId ?? getStoredUserId()
      );

      if (!normalized) {
        return prevTask ?? null;
      }

      return normalized;
    });
  }, []);

  const fetchTaskStatus = useCallback(
    async (showLoading = false) => {
      if (!taskId) {
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const response = await apiClient.get<unknown>(
          API_ENDPOINTS.TASKS.STATUS(taskId)
        );

        if (response.success && response.data) {
          const rawTask = response.data as RawTaskPayload;
          mergeTaskUpdate({
            ...rawTask,
            id:
              (rawTask.task_id as ID) ||
              (rawTask.taskId as ID) ||
              (rawTask.id as ID) ||
              (taskId as ID),
          });
          setError(null);
        }
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) {
          // TaskProgress record may not exist yet; treat as pending and keep polling
          mergeTaskUpdate({
            id: taskId as ID,
            status: "pending",
            progress: 0,
            progressMessage: "Waiting for task to start...",
          });
          setError(null);
        } else {
          console.error(`Failed to fetch task ${taskId}:`, err);
          setError(
            err instanceof Error ? err.message : "Failed to load task status"
          );
        }
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [mergeTaskUpdate, taskId]
  );

  // Reset state when taskId changes
  useEffect(() => {
    if (lastTaskIdRef.current === taskId) {
      return;
    }

    lastTaskIdRef.current = taskId ?? null;
    setTask(null);
    setError(null);
    setIsLoading(false);
    clearPolling();
    if (initialFetchTimeoutRef.current) {
      clearTimeout(initialFetchTimeoutRef.current);
      initialFetchTimeoutRef.current = null;
    }
    if (completionRefreshTimeoutRef.current) {
      clearTimeout(completionRefreshTimeoutRef.current);
      completionRefreshTimeoutRef.current = null;
    }

    if (taskId) {
      initialFetchTimeoutRef.current = window.setTimeout(() => {
        fetchTaskStatus(true);
      }, 500);
    }

    return () => {
      clearPolling();
      if (initialFetchTimeoutRef.current) {
        clearTimeout(initialFetchTimeoutRef.current);
        initialFetchTimeoutRef.current = null;
      }
      if (completionRefreshTimeoutRef.current) {
        clearTimeout(completionRefreshTimeoutRef.current);
        completionRefreshTimeoutRef.current = null;
      }
    };
  }, [taskId, fetchTaskStatus, clearPolling]);

  // Polling fallback for active tasks
  useEffect(() => {
    if (!taskId) {
      clearPolling();
      return;
    }

    if (task && TERMINAL_STATUSES.includes(task.status as TaskStatus)) {
      clearPolling();
      return;
    }

    clearPolling();
    pollingIntervalRef.current = window.setInterval(() => {
      fetchTaskStatus();
    }, pollInterval);

    return () => {
      clearPolling();
    };
  }, [taskId, task?.status, fetchTaskStatus, clearPolling, pollInterval]);

  const handleProgressMessage = useCallback(
    (message: WebSocketMessage<TaskProgressMessage>) => {
      const incomingTaskId =
        (message.data.taskId ?? message.data.task_id) as ID | undefined;

      if (!taskId || incomingTaskId !== taskId) {
        return;
      }

      mergeTaskUpdate({
        ...message.data,
        id: (incomingTaskId ?? taskId) as ID,
        progressMessage:
          message.data.progressMessage ?? message.data.currentStep ??
          undefined,
        estimatedDuration: message.data.estimatedTimeRemaining,
      });
      setError(null);
    },
    [mergeTaskUpdate, taskId]
  );

  const scheduleCompletionRefresh = useCallback(() => {
    if (!taskId) {
      return;
    }

    if (completionRefreshTimeoutRef.current) {
      clearTimeout(completionRefreshTimeoutRef.current);
    }

    completionRefreshTimeoutRef.current = window.setTimeout(() => {
      fetchTaskStatus();
      completionRefreshTimeoutRef.current = null;
    }, 300);
  }, [fetchTaskStatus, taskId]);

  const handleCompletionMessage = useCallback(
    (message: WebSocketMessage<TaskCompleteMessage>) => {
      const incomingTaskId =
        (message.data.taskId ?? message.data.task_id) as ID | undefined;

      if (!taskId || incomingTaskId !== taskId) {
        return;
      }

      mergeTaskUpdate({
        ...message.data,
        id: (incomingTaskId ?? taskId) as ID,
        progress: 100,
        result: message.data.result,
        error: message.data.error,
        completedAt: new Date().toISOString(),
        actualDuration: message.data.duration,
      });
      setError(null);
      scheduleCompletionRefresh();
    },
    [mergeTaskUpdate, scheduleCompletionRefresh, taskId]
  );

  // WebSocket subscriptions
  useWebSocketSubscription<TaskProgressMessage>(
    WS_CHANNELS.TASK_PROGRESS,
    handleProgressMessage,
    {
      messageTypes: ["task_progress"],
      taskId: taskId ?? undefined,
    },
    [handleProgressMessage, taskId]
  );

  useWebSocketSubscription<TaskCompleteMessage>(
    WS_CHANNELS.TASK_COMPLETE,
    handleCompletionMessage,
    {
      messageTypes: ["task_complete", "task_error", "task_cancelled"],
      taskId: taskId ?? undefined,
    },
    [handleCompletionMessage, taskId]
  );

  const status = task?.status as TaskStatus | undefined;

  return {
    task,
    status,
    isLoading,
    error,
    isActive: status === "running" || status === "pending",
    isCompleted: status === "completed",
    isFailed: status === "failed",
    isCancelled: status === "cancelled",
    progress: task?.progress || 0,
    progressMessage: task?.progressMessage,
  };
}
