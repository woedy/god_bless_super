import React, { useState, useEffect } from 'react';
import { FiBell, FiX, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { TaskCompletedData } from '../../hooks/useTaskWebSocket';

interface Notification {
  id: string;
  task: TaskCompletedData;
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  notifications: TaskCompletedData[];
  onClearAll?: () => void;
  onClearNotification?: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications: incomingNotifications,
  onClearAll,
  onClearNotification
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Add new notifications
    incomingNotifications.forEach(task => {
      const exists = notifications.find(n => n.task.task_id === task.task_id);
      if (!exists) {
        const newNotification: Notification = {
          id: `${task.task_id}-${Date.now()}`,
          task,
          timestamp: new Date(),
          read: false
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    });
  }, [incomingNotifications]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    onClearNotification?.(id);
  };

  const clearAll = () => {
    setNotifications([]);
    onClearAll?.();
  };

  const getNotificationIcon = (status: string) => {
    if (status === 'SUCCESS' || status === 'completed') {
      return <FiCheckCircle className="text-meta-3" size={20} />;
    }
    if (status === 'FAILURE' || status === 'failed') {
      return <FiAlertCircle className="text-meta-1" size={20} />;
    }
    return <FiLoader className="text-primary" size={20} />;
  };

  const getNotificationTitle = (status: string) => {
    if (status === 'SUCCESS' || status === 'completed') {
      return 'Task Completed Successfully';
    }
    if (status === 'FAILURE' || status === 'failed') {
      return 'Task Failed';
    }
    return 'Task Update';
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
      >
        <FiBell size={20} className="text-black dark:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-meta-1 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-998"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Dropdown Panel */}
          <div className="absolute right-0 top-12 z-999 w-80 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
              <h5 className="text-sm font-medium text-black dark:text-white">
                Notifications ({notifications.length})
              </h5>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-meta-1 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No notifications
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-stroke px-4 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4 ${
                      !notification.read ? 'bg-gray-2 dark:bg-meta-4' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.task.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black dark:text-white">
                          {getNotificationTitle(notification.task.status)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Task ID: {notification.task.task_id.substring(0, 12)}...
                        </p>
                        {notification.task.error_message && (
                          <p className="mt-1 text-xs text-meta-1">
                            {notification.task.error_message}
                          </p>
                        )}
                        {notification.task.result_data?.message && (
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                            {notification.task.result_data.message}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
