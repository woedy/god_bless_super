/**
 * WebSocket Manager Service
 * Handles WebSocket connections with automatic reconnection, channel subscriptions, and message routing
 */

import { config } from "../config";
import { STORAGE_KEYS } from "../config/constants";
import type {
  WebSocketManager as IWebSocketManager,
  WebSocketMessage,
  WebSocketConfig,
  WebSocketConnectionState,
  WebSocketStatus,
  WebSocketError,
  ChannelSubscription,
  ChannelFilters,
  WebSocketEventHandlers,
} from "../types/websocket";

/**
 * WebSocket Manager Implementation
 */
class WebSocketManager implements IWebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private connectionState: WebSocketConnectionState;
  private subscriptions: Map<string, ChannelSubscription[]> = new Map();
  private eventHandlers: WebSocketEventHandlers = {};
  private reconnectTimeoutId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isIntentionalDisconnect = false;

  // Reconnection configuration
  private readonly baseReconnectInterval = 1000; // 1 second
  private readonly maxReconnectInterval = 30000; // 30 seconds
  private readonly maxReconnectAttempts = 10;
  private readonly heartbeatInterval = 30000; // 30 seconds

  constructor(wsConfig?: Partial<WebSocketConfig>) {
    this.config = {
      url: config.wsUrl,
      protocols: [],
      reconnectInterval: this.baseReconnectInterval,
      maxReconnectAttempts: this.maxReconnectAttempts,
      heartbeatInterval: this.heartbeatInterval,
      timeout: 10000,
      ...wsConfig,
    };

    this.connectionState = {
      status: "disconnected",
      isConnected: false,
      reconnectAttempts: 0,
    };

    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(): Promise<void> {
    if (
      this.ws?.readyState === WebSocket.CONNECTING ||
      this.ws?.readyState === WebSocket.OPEN
    ) {
      console.log("WebSocket: Already connected or connecting");
      return;
    }

    this.isIntentionalDisconnect = false;
    this.updateConnectionState("connecting");

    try {
      const wsUrl = this.buildWebSocketUrl();
      console.log("WebSocket: Connecting to", wsUrl);

      this.ws = new WebSocket(wsUrl, this.config.protocols);
      this.attachEventListeners();

      // Return a promise that resolves when connection is established
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, this.config.timeout);

        const onOpen = () => {
          clearTimeout(timeout);
          resolve();
        };

        const onError = () => {
          clearTimeout(timeout);
          reject(new Error("WebSocket connection failed"));
        };

        this.ws!.addEventListener("open", onOpen, { once: true });
        this.ws!.addEventListener("error", onError, { once: true });
      });
    } catch (error) {
      console.error("WebSocket: Connection failed", error);
      this.updateConnectionState("error", {
        code: 1006,
        reason: "Connection failed",
        wasClean: false,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    console.log("WebSocket: Disconnecting");
    this.isIntentionalDisconnect = true;
    this.clearReconnectTimeout();
    this.clearHeartbeat();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.updateConnectionState("disconnected");
  }

  /**
   * Subscribe to a channel with optional filters
   */
  public subscribe(
    channel: string,
    callback: (message: WebSocketMessage) => void,
    filters?: ChannelFilters
  ): () => void {
    const subscription: ChannelSubscription = {
      channel,
      callback,
      filters,
    };

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }

    this.subscriptions.get(channel)!.push(subscription);
    console.log(`WebSocket: Subscribed to channel '${channel}'`, filters);

    // Send subscription message if connected
    if (this.isConnected()) {
      this.sendSubscriptionMessage(channel, "subscribe", filters);
    }

    // Return unsubscribe function
    return () => {
      const channelSubscriptions = this.subscriptions.get(channel);
      if (channelSubscriptions) {
        const index = channelSubscriptions.indexOf(subscription);
        if (index > -1) {
          channelSubscriptions.splice(index, 1);
          if (channelSubscriptions.length === 0) {
            this.subscriptions.delete(channel);
            // Send unsubscribe message if connected
            if (this.isConnected()) {
              this.sendSubscriptionMessage(channel, "unsubscribe");
            }
          }
        }
      }
      console.log(`WebSocket: Unsubscribed from channel '${channel}'`);
    };
  }

  /**
   * Unsubscribe from a channel
   */
  public unsubscribe(channel: string): void {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.delete(channel);
      console.log(`WebSocket: Unsubscribed from channel '${channel}'`);

      // Send unsubscribe message if connected
      if (this.isConnected()) {
        this.sendSubscriptionMessage(channel, "unsubscribe");
      }
    }
  }

  /**
   * Send a message through WebSocket
   */
  public send(message: Partial<WebSocketMessage>): void {
    const fullMessage: WebSocketMessage = {
      type: message.type || "ping",
      channel: message.channel || "default",
      data: message.data || {},
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      ...message,
    };

    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(fullMessage));
        console.log(
          "WebSocket: Message sent",
          fullMessage.type,
          fullMessage.channel
        );
      } catch (error) {
        console.error("WebSocket: Failed to send message", error);
        this.messageQueue.push(fullMessage);
      }
    } else {
      console.log(
        "WebSocket: Queuing message (not connected)",
        fullMessage.type
      );
      this.messageQueue.push(fullMessage);
    }
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN && this.connectionState.isConnected
    );
  }

  /**
   * Set event handlers
   */
  public setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Build WebSocket URL with authentication
   */
  private buildWebSocketUrl(): string {
    let wsUrl: string;

    // Handle relative paths by converting to absolute WebSocket URL
    if (this.config.url.startsWith('/')) {
      // Convert relative path to absolute WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}${this.config.url}`;
    } else {
      // Use the provided URL as-is
      wsUrl = this.config.url;
    }

    const url = new URL(wsUrl);

    // Add authentication token if available
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      url.searchParams.set("token", token);
    }

    return url.toString();
  }

  /**
   * Attach event listeners to WebSocket
   */
  private attachEventListeners(): void {
    if (!this.ws) return;

    this.ws.addEventListener("open", this.handleOpen);
    this.ws.addEventListener("close", this.handleClose);
    this.ws.addEventListener("error", this.handleError);
    this.ws.addEventListener("message", this.handleMessage);
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    console.log("WebSocket: Connected successfully");
    this.updateConnectionState("connected");
    this.connectionState.reconnectAttempts = 0;
    this.connectionState.lastConnected = new Date().toISOString();

    // Start heartbeat
    this.startHeartbeat();

    // Resubscribe to all channels
    this.resubscribeToChannels();

    // Send queued messages
    this.sendQueuedMessages();

    // Call event handler
    this.eventHandlers.onOpen?.(event);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log("WebSocket: Connection closed", event.code, event.reason);
    this.updateConnectionState("disconnected");
    this.connectionState.lastDisconnected = new Date().toISOString();
    this.clearHeartbeat();

    const wsError: WebSocketError = {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      timestamp: new Date().toISOString(),
    };

    this.connectionState.error = wsError;

    // Call event handler
    this.eventHandlers.onClose?.(event);

    // Attempt reconnection if not intentional disconnect
    if (!this.isIntentionalDisconnect && this.shouldReconnect(event.code)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error("WebSocket: Error occurred", event);
    this.updateConnectionState("error");

    // Call event handler
    this.eventHandlers.onError?.(event);
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log("WebSocket: Message received", message.type, message.channel);

      // Handle system messages
      if (message.type === "pong") {
        // Heartbeat response - no action needed
        return;
      }

      // Route message to subscribers
      this.routeMessage(message);

      // Call event handler
      this.eventHandlers.onMessage?.(message);
    } catch (error) {
      console.error("WebSocket: Failed to parse message", error, event.data);
    }
  }

  /**
   * Route message to appropriate subscribers
   */
  private routeMessage(message: WebSocketMessage): void {
    const channelSubscriptions = this.subscriptions.get(message.channel);
    if (!channelSubscriptions) {
      console.log(`WebSocket: No subscribers for channel '${message.channel}'`);
      return;
    }

    channelSubscriptions.forEach((subscription) => {
      if (this.messageMatchesFilters(message, subscription.filters)) {
        try {
          subscription.callback(message);
        } catch (error) {
          console.error("WebSocket: Error in subscription callback", error);
        }
      }
    });
  }

  /**
   * Check if message matches subscription filters
   */
  private messageMatchesFilters(
    message: WebSocketMessage,
    filters?: ChannelFilters
  ): boolean {
    if (!filters) return true;

    if (filters.userId && message.userId !== filters.userId) {
      return false;
    }

    if (filters.projectId && message.projectId !== filters.projectId) {
      return false;
    }

    if (filters.messageTypes && !filters.messageTypes.includes(message.type)) {
      return false;
    }

    return true;
  }

  /**
   * Update connection state
   */
  private updateConnectionState(
    status: WebSocketStatus,
    error?: WebSocketError
  ): void {
    this.connectionState = {
      ...this.connectionState,
      status,
      isConnected: status === "connected",
      error,
    };
  }

  /**
   * Determine if reconnection should be attempted
   */
  private shouldReconnect(closeCode: number): boolean {
    // Don't reconnect for certain close codes
    const noReconnectCodes = [1000, 1001, 1005, 4000, 4001, 4002, 4003];
    return (
      !noReconnectCodes.includes(closeCode) &&
      this.connectionState.reconnectAttempts < this.maxReconnectAttempts
    );
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.connectionState.reconnectAttempts++;
    const attempt = this.connectionState.reconnectAttempts;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.baseReconnectInterval * Math.pow(2, attempt - 1),
      this.maxReconnectInterval
    );

    console.log(
      `WebSocket: Scheduling reconnect attempt ${attempt}/${this.maxReconnectAttempts} in ${delay}ms`
    );
    this.updateConnectionState("reconnecting");

    this.reconnectTimeoutId = window.setTimeout(async () => {
      try {
        this.eventHandlers.onReconnect?.(attempt);
        await this.connect();
      } catch (error) {
        console.error(`WebSocket: Reconnect attempt ${attempt} failed`, error);

        if (attempt >= this.maxReconnectAttempts) {
          console.error("WebSocket: Max reconnect attempts reached");
          this.eventHandlers.onReconnectFailed?.();
        } else {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Clear reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: "ping",
          channel: "heartbeat",
          data: { timestamp: Date.now() },
        });
      }
    }, this.config.heartbeatInterval!);
  }

  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private resubscribeToChannels(): void {
    this.subscriptions.forEach((subscriptions, channel) => {
      if (subscriptions.length > 0) {
        // Use filters from first subscription (they should be the same for the channel)
        const filters = subscriptions[0].filters;
        this.sendSubscriptionMessage(channel, "subscribe", filters);
      }
    });
  }

  /**
   * Send subscription/unsubscription message
   */
  private sendSubscriptionMessage(
    channel: string,
    action: "subscribe" | "unsubscribe",
    filters?: ChannelFilters
  ): void {
    this.send({
      type: "ping", // Use a valid WebSocketMessageType
      channel: "system",
      data: {
        action,
        channel,
        filters,
      },
    });
  }

  /**
   * Send all queued messages
   */
  private sendQueuedMessages(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        this.ws!.send(JSON.stringify(message));
        console.log(
          "WebSocket: Queued message sent",
          message.type,
          message.channel
        );
      } catch (error) {
        console.error("WebSocket: Failed to send queued message", error);
        // Put message back at the front of the queue
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
export const websocketManager = new WebSocketManager();

// Export the class for testing
export { WebSocketManager };
