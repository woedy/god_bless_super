/**
 * WebSocket Hook
 * Custom hook for managing WebSocket connections and subscriptions
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { websocketManager } from '../services/websocket'
import type {
  WebSocketMessage,
  WebSocketConnectionState,
  ChannelFilters
} from '../types/websocket'

/**
 * Hook for managing WebSocket connection
 */
export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>(
    websocketManager.getConnectionState()
  )

  useEffect(() => {
    // Set up event handlers
    websocketManager.setEventHandlers({
      onOpen: () => {
        setConnectionState(websocketManager.getConnectionState())
      },
      onClose: () => {
        setConnectionState(websocketManager.getConnectionState())
      },
      onError: () => {
        setConnectionState(websocketManager.getConnectionState())
      },
      onReconnect: (attempt) => {
        console.log(`WebSocket reconnection attempt ${attempt}`)
        setConnectionState(websocketManager.getConnectionState())
      },
      onReconnectFailed: () => {
        console.error('WebSocket reconnection failed')
        setConnectionState(websocketManager.getConnectionState())
      }
    })

    // Connect to WebSocket
    websocketManager.connect().catch(error => {
      console.error('Failed to connect to WebSocket:', error)
    })

    // Update connection state periodically
    const interval = setInterval(() => {
      setConnectionState(websocketManager.getConnectionState())
    }, 1000)

    return () => {
      clearInterval(interval)
      websocketManager.disconnect()
    }
  }, [])

  const connect = useCallback(async () => {
    try {
      await websocketManager.connect()
      setConnectionState(websocketManager.getConnectionState())
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      throw error
    }
  }, [])

  const disconnect = useCallback(() => {
    websocketManager.disconnect()
    setConnectionState(websocketManager.getConnectionState())
  }, [])

  const send = useCallback((message: Partial<WebSocketMessage>) => {
    websocketManager.send(message)
  }, [])

  return {
    connectionState,
    isConnected: connectionState.isConnected,
    connect,
    disconnect,
    send
  }
}

/**
 * Hook for subscribing to WebSocket channels
 */
export function useWebSocketSubscription<T = unknown>(
  channel: string,
  callback: (message: WebSocketMessage<T>) => void,
  filters?: ChannelFilters,
  dependencies: React.DependencyList = []
) {
  const callbackRef = useRef(callback)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    // Unsubscribe from previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    // Subscribe to channel
    unsubscribeRef.current = websocketManager.subscribe(
      channel,
      (message) => callbackRef.current(message),
      filters
    )

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [channel, filters, ...dependencies])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])
}

/**
 * Hook for managing multiple WebSocket subscriptions
 */
export function useWebSocketSubscriptions() {
  const subscriptions = useRef<Map<string, () => void>>(new Map())

  const subscribe = useCallback(<T = unknown>(
    channel: string,
    callback: (message: WebSocketMessage<T>) => void,
    filters?: ChannelFilters
  ) => {
    // Unsubscribe existing subscription for this channel
    const existingUnsubscribe = subscriptions.current.get(channel)
    if (existingUnsubscribe) {
      existingUnsubscribe()
    }

    // Create new subscription
    const unsubscribe = websocketManager.subscribe(channel, callback, filters)
    subscriptions.current.set(channel, unsubscribe)

    return () => {
      unsubscribe()
      subscriptions.current.delete(channel)
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    const unsubscribeFunc = subscriptions.current.get(channel)
    if (unsubscribeFunc) {
      unsubscribeFunc()
      subscriptions.current.delete(channel)
    }
  }, [])

  const unsubscribeAll = useCallback(() => {
    subscriptions.current.forEach(unsubscribeFunc => unsubscribeFunc())
    subscriptions.current.clear()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll()
    }
  }, [unsubscribeAll])

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll
  }
}