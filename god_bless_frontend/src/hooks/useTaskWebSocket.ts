import { useEffect, useRef, useState, useCallback } from 'react';
import { baseUrl } from '../constants';

export interface TaskProgressData {
  task_id: string;
  status: string;
  progress: number;
  current_step: string;
  processed_items: number;
  total_items: number;
  estimated_completion?: string;
}

export interface TaskCompletedData {
  task_id: string;
  status: string;
  result_data?: any;
  error_message?: string;
}

interface WebSocketMessage {
  type: 'task_progress' | 'task_completed' | 'active_tasks' | 'task_status' | 'task_cancelled' | 'error';
  task_id?: string;
  tasks?: TaskProgressData[];
  [key: string]: any;
}

interface UseTaskWebSocketOptions {
  userId?: string | number;
  onProgress?: (data: TaskProgressData) => void;
  onCompleted?: (data: TaskCompletedData) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export const useTaskWebSocket = (options: UseTaskWebSocketOptions = {}) => {
  const {
    userId,
    onProgress,
    onCompleted,
    onError,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [activeTasks, setActiveTasks] = useState<TaskProgressData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Get authentication token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        if (onError) {
          onError('Authentication required');
        }
        return;
      }

      // Determine WebSocket URL based on environment
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const wsUrl = `${wsProtocol}//${wsHost}/ws/tasks/?token=${token}`;

      console.log('Connecting to WebSocket:', wsUrl.replace(token, '***'));
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);

          switch (message.type) {
            case 'task_progress':
              if (onProgress && message.task_id) {
                onProgress(message as TaskProgressData);
              }
              // Update active tasks list
              setActiveTasks(prev => {
                const index = prev.findIndex(t => t.task_id === message.task_id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = message as TaskProgressData;
                  return updated;
                }
                return [...prev, message as TaskProgressData];
              });
              break;

            case 'task_completed':
              if (onCompleted && message.task_id) {
                onCompleted(message as TaskCompletedData);
              }
              // Remove from active tasks
              setActiveTasks(prev => prev.filter(t => t.task_id !== message.task_id));
              break;

            case 'active_tasks':
              if (message.tasks) {
                setActiveTasks(message.tasks);
              }
              break;

            case 'task_status':
              // Handle individual task status response
              console.log('Task status:', message);
              break;

            case 'task_cancelled':
              console.log('Task cancelled:', message.task_id);
              setActiveTasks(prev => prev.filter(t => t.task_id !== message.task_id));
              break;

            case 'error':
              console.error('WebSocket error message:', message.message);
              if (onError) {
                onError(message.message || 'Unknown error');
              }
              break;

            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) {
          onError('WebSocket connection error');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          if (onError) {
            onError('Failed to maintain WebSocket connection');
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      if (onError) {
        onError('Failed to create WebSocket connection');
      }
    }
  }, [userId, onProgress, onCompleted, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const getTaskStatus = useCallback((taskId: string) => {
    sendMessage({
      type: 'get_task_status',
      task_id: taskId
    });
  }, [sendMessage]);

  const cancelTask = useCallback((taskId: string) => {
    sendMessage({
      type: 'cancel_task',
      task_id: taskId
    });
  }, [sendMessage]);

  const refreshActiveTasks = useCallback(() => {
    sendMessage({
      type: 'get_active_tasks'
    });
  }, [sendMessage]);

  useEffect(() => {
    if (autoConnect && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, userId, connect, disconnect]);

  return {
    isConnected,
    activeTasks,
    connect,
    disconnect,
    sendMessage,
    getTaskStatus,
    cancelTask,
    refreshActiveTasks
  };
};
