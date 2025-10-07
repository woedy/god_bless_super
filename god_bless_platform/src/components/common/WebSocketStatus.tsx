/**
 * WebSocket Status Component
 * Displays the current WebSocket connection status with visual indicators
 */

import { useWebSocket } from '../../hooks'

interface WebSocketStatusProps {
  className?: string
  showDetails?: boolean
  showReconnectButton?: boolean
}

/**
 * WebSocket Status Component
 */
export function WebSocketStatus({
  className = '',
  showDetails = false,
  showReconnectButton = true
}: WebSocketStatusProps) {
  const { connectionState, isConnected, connect, disconnect } = useWebSocket()

  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'text-green-600'
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-600'
      case 'disconnected':
        return 'text-gray-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (connectionState.status) {
      case 'connected':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'connecting':
      case 'reconnecting':
        return (
          <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      case 'disconnected':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getStatusText = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'reconnecting':
        return `Reconnecting... (${connectionState.reconnectAttempts})`
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  const handleReconnect = async () => {
    try {
      if (isConnected) {
        disconnect()
      } else {
        await connect()
      }
    } catch (error) {
      console.error('Failed to reconnect:', error)
    }
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
      </div>

      {showReconnectButton && !isConnected && (
        <button
          onClick={handleReconnect}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
          disabled={connectionState.status === 'connecting' || connectionState.status === 'reconnecting'}
        >
          {connectionState.status === 'connecting' || connectionState.status === 'reconnecting' 
            ? 'Connecting...' 
            : 'Reconnect'
          }
        </button>
      )}

      {showDetails && (
        <div className="text-xs text-gray-500">
          {connectionState.lastConnected && (
            <div>Last connected: {new Date(connectionState.lastConnected).toLocaleTimeString()}</div>
          )}
          {connectionState.lastDisconnected && (
            <div>Last disconnected: {new Date(connectionState.lastDisconnected).toLocaleTimeString()}</div>
          )}
          {connectionState.error && (
            <div className="text-red-600">
              Error: {connectionState.error.reason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WebSocketStatus