import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTaskWebSocket, TaskProgressData, TaskCompletedData } from '../hooks/useTaskWebSocket';
import { TaskNotification } from '../components/TaskProgress';

interface TaskNotificationContextType {
  isConnected: boolean;
  activeTasks: TaskProgressData[];
  completedNotifications: TaskCompletedData[];
  connect: () => void;
  disconnect: () => void;
  cancelTask: (taskId: string) => void;
  refreshActiveTasks: () => void;
  clearNotification: (taskId: string) => void;
  clearAllNotifications: () => void;
}

const TaskNotificationContext = createContext<TaskNotificationContextType | undefined>(undefined);

interface TaskNotificationProviderProps {
  children: ReactNode;
  userId?: string | number;
  autoConnect?: boolean;
}

export const TaskNotificationProvider: React.FC<TaskNotificationProviderProps> = ({
  children,
  userId,
  autoConnect = true
}) => {
  const [completedNotifications, setCompletedNotifications] = useState<TaskCompletedData[]>([]);

  const handleProgress = useCallback((data: TaskProgressData) => {
    // Progress updates are handled by the WebSocket hook
    console.log('Task progress:', data);
  }, []);

  const handleCompleted = useCallback((data: TaskCompletedData) => {
    setCompletedNotifications(prev => [...prev, data]);
  }, []);

  const {
    isConnected,
    activeTasks,
    connect,
    disconnect,
    cancelTask,
    refreshActiveTasks
  } = useTaskWebSocket({
    userId,
    onProgress: handleProgress,
    onCompleted: handleCompleted,
    autoConnect
  });

  const clearNotification = useCallback((taskId: string) => {
    setCompletedNotifications(prev => prev.filter(n => n.task_id !== taskId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setCompletedNotifications([]);
  }, []);

  const value: TaskNotificationContextType = {
    isConnected,
    activeTasks,
    completedNotifications,
    connect,
    disconnect,
    cancelTask,
    refreshActiveTasks,
    clearNotification,
    clearAllNotifications
  };

  return (
    <TaskNotificationContext.Provider value={value}>
      {children}
      {/* Render notifications */}
      {completedNotifications.map((notification, index) => (
        <TaskNotification
          key={`${notification.task_id}-${index}`}
          task={notification}
          onClose={() => clearNotification(notification.task_id)}
        />
      ))}
    </TaskNotificationContext.Provider>
  );
};

export const useTaskNotifications = (): TaskNotificationContextType => {
  const context = useContext(TaskNotificationContext);
  if (!context) {
    throw new Error('useTaskNotifications must be used within a TaskNotificationProvider');
  }
  return context;
};
