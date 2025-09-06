import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

// Create React plugin instance
const reactPlugin = new ReactPlugin();

// Application Insights configuration
const appInsights = new ApplicationInsights({
  config: {
    // You'll need to set this in your environment variables
    // For now, using a placeholder - replace with your actual connection string
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING || 'InstrumentationKey=placeholder',
    extensions: [reactPlugin],
    extensionConfig: {
      [reactPlugin.identifier]: {
        history: null, // We'll handle routing manually since it's a SPA
      },
    },
    enableAutoRouteTracking: false, // We'll track manually for better control
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true,
    enableAjaxErrorStatusText: true,
    enableAjaxPerfTracking: true,
    maxAjaxCallsPerView: 10,
    disableAjaxTracking: false,
    disableFetchTracking: false,
    enableUnhandledPromiseRejectionTracking: true,
    
    // Performance tracking enabled by default
    
    // Sampling configuration (100% for development)
    samplingPercentage: 100,
    
    // Exception tracking enabled by default
  },
});

// Initialize Application Insights
if (import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING) {
  appInsights.loadAppInsights();
  console.log('Application Insights initialized');
  
  console.log('Application Insights loaded successfully');
} else {
  console.warn('Application Insights connection string not found. Analytics disabled in development.');
}

// Analytics event types for better type safety
export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  conversationId: string;
  messageLength: number;
  containsSensitiveData?: boolean;
}

export interface UserInteraction {
  action: 'avatar_click' | 'microphone_toggle' | 'chat_send' | 'voice_input' | 'settings_change';
  context?: string;
  timestamp: string;
  sessionId: string;
}

export interface ConversationSession {
  conversationId: string;
  startTime: string;
  messageCount: number;
  duration?: number;
  topics?: string[];
  userEngagement: 'high' | 'medium' | 'low';
}

class Analytics {
  private conversationId: string | null = null;
  private sessionId: string;
  private conversationStartTime: Date | null = null;
  private messageCount = 0;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.trackPageView();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private getPlatform(): string {
    // Use modern userAgentData API if available, fallback to userAgent parsing
    const userAgentData = (navigator as any).userAgentData;
    if (userAgentData?.platform) {
      return userAgentData.platform;
    }

    // Fallback: detect platform from userAgent
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'unknown';
  }

  private sanitizeMessage(content: string): { sanitized: string; containsSensitive: boolean } {
    // Basic sensitive data detection patterns
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
    ];

    let containsSensitive = false;
    let sanitized = content;

    sensitivePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        containsSensitive = true;
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
    });

    // Limit message length for storage
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 497) + '...';
    }

    return { sanitized, containsSensitive };
  }

  // Track page view
  trackPageView(): void {
    if (!appInsights.appInsights) return;
    
    appInsights.trackPageView({
      name: 'Avatar Demo',
      uri: window.location.href,
      properties: {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: this.getPlatform(),
        language: navigator.language,
      },
    });

    // Send a heartbeat event for Live Metrics visibility
    this.trackHeartbeat();
  }

  // Track heartbeat for Live Metrics
  private trackHeartbeat(): void {
    if (!appInsights.appInsights) return;
    
    const heartbeat = () => {
      appInsights.trackEvent({
        name: 'Heartbeat',
        properties: {
          sessionId: this.sessionId,
          conversationId: this.conversationId || 'none',
          timestamp: new Date().toISOString(),
          isActive: !document.hidden,
        },
        measurements: {
          messagesInSession: this.messageCount,
        },
      });
    };

    // Send initial heartbeat
    heartbeat();

    // Send heartbeat every 10 seconds for Live Metrics visibility
    setInterval(() => {
      heartbeat();
      this.sendLiveMetricsPing();
    }, 10000);
  }

  // Start a new conversation
  startConversation(): string {
    this.conversationId = this.generateConversationId();
    this.conversationStartTime = new Date();
    this.messageCount = 0;

    if (!appInsights.appInsights) return this.conversationId;

    appInsights.trackEvent({
      name: 'ConversationStarted',
      properties: {
        conversationId: this.conversationId,
        sessionId: this.sessionId,
        timestamp: this.conversationStartTime.toISOString(),
      },
    });

    return this.conversationId;
  }

  // Track chat messages
  trackChatMessage(message: Omit<ChatMessage, 'conversationId' | 'timestamp' | 'messageLength' | 'containsSensitiveData'>): void {
    if (!appInsights.appInsights) return;

    if (!this.conversationId) {
      this.startConversation();
    }

    const { sanitized, containsSensitive } = this.sanitizeMessage(message.content);
    this.messageCount++;

    const chatMessage: ChatMessage = {
      ...message,
      content: sanitized,
      conversationId: this.conversationId!,
      timestamp: new Date().toISOString(),
      messageLength: message.content.length,
      containsSensitiveData: containsSensitive,
    };

    appInsights.trackEvent({
      name: 'ChatMessage',
      properties: {
        role: chatMessage.role,
        conversationId: chatMessage.conversationId,
        sessionId: this.sessionId,
        messageLength: chatMessage.messageLength,
        containsSensitiveData: chatMessage.containsSensitiveData,
        messageNumber: this.messageCount,
        timestamp: chatMessage.timestamp,
      },
      measurements: {
        messageLength: chatMessage.messageLength,
        messageNumber: this.messageCount,
      },
    });

    // Store full message content in custom table (optional - only if not sensitive)
    if (!containsSensitive && sanitized.length < 200) {
      appInsights.trackTrace({
        message: `Chat: ${chatMessage.role}: ${sanitized}`,
        severityLevel: 1, // Information
        properties: {
          conversationId: chatMessage.conversationId,
          sessionId: this.sessionId,
          role: chatMessage.role,
          timestamp: chatMessage.timestamp,
        },
      });
    }
  }

  // Track user interactions
  trackInteraction(interaction: Omit<UserInteraction, 'timestamp' | 'sessionId'>): void {
    if (!appInsights.appInsights) return;

    const fullInteraction: UserInteraction = {
      ...interaction,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    appInsights.trackEvent({
      name: 'UserInteraction',
      properties: {
        action: fullInteraction.action,
        context: fullInteraction.context,
        sessionId: fullInteraction.sessionId,
        conversationId: this.conversationId,
        timestamp: fullInteraction.timestamp,
      },
    });
  }

  // End conversation and track summary
  endConversation(): void {
    if (!appInsights.appInsights || !this.conversationId || !this.conversationStartTime) return;

    const duration = Date.now() - this.conversationStartTime.getTime();
    const userEngagement = this.calculateEngagement();

    const session: ConversationSession = {
      conversationId: this.conversationId,
      startTime: this.conversationStartTime.toISOString(),
      messageCount: this.messageCount,
      duration,
      userEngagement,
    };

    appInsights.trackEvent({
      name: 'ConversationEnded',
      properties: {
        conversationId: session.conversationId,
        sessionId: this.sessionId,
        startTime: session.startTime,
        messageCount: session.messageCount,
        userEngagement: session.userEngagement,
        timestamp: new Date().toISOString(),
      },
      measurements: {
        duration: session.duration || 0,
        messageCount: session.messageCount,
      },
    });

    // Reset conversation state
    this.conversationId = null;
    this.conversationStartTime = null;
    this.messageCount = 0;
  }

  private calculateEngagement(): 'high' | 'medium' | 'low' {
    if (this.messageCount >= 10) return 'high';
    if (this.messageCount >= 5) return 'medium';
    return 'low';
  }

  // Track errors
  trackError(error: Error, context?: string): void {
    if (!appInsights.appInsights) return;

    appInsights.trackException({
      exception: error,
      properties: {
        context,
        conversationId: this.conversationId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Track custom metrics
  trackMetric(name: string, value: number, properties?: Record<string, string>): void {
    if (!appInsights.appInsights) return;

    appInsights.trackMetric({
      name,
      average: value,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        conversationId: this.conversationId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Track performance metrics for Live Metrics
  trackPerformance(metricName: string, duration: number): void {
    if (!appInsights.appInsights) return;

    // Track as both metric and custom event for Live Metrics
    this.trackMetric(metricName, duration, {
      category: 'Performance'
    });

    appInsights.trackEvent({
      name: 'PerformanceMetric',
      properties: {
        metricName,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      },
      measurements: {
        duration,
      },
    });
  }

  // Track dependency calls (useful for Live Metrics)
  trackDependency(name: string, command: string, startTime: Date, duration: number, success: boolean): void {
    if (!appInsights.appInsights) return;

    appInsights.trackDependencyData({
      id: `${name}-${Date.now()}`,
      name,
      data: command,
      startTime,
      duration,
      success,
      responseCode: success ? 200 : 500,
      properties: {
        sessionId: this.sessionId,
        conversationId: this.conversationId,
      },
    });
  }

  // Send immediate telemetry for Live Metrics
  sendLiveMetricsPing(): void {
    if (!appInsights.appInsights) return;
    
    // Send multiple events that are visible in Live Metrics
    appInsights.trackEvent({
      name: 'LiveMetricsPing',
      properties: {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        source: 'live_metrics_ping',
      },
    });

    // Track a custom metric
    appInsights.trackMetric({
      name: 'ActiveSessions',
      average: 1,
      properties: {
        sessionId: this.sessionId,
      },
    });

    // Force immediate send
    appInsights.flush();
    
    console.log('Live Metrics ping sent');
  }

  // Flush any pending telemetry (useful before page unload)
  flush(): void {
    if (!appInsights.appInsights) return;
    appInsights.flush();
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export the React plugin for component wrapping
export { reactPlugin };

// Convenience functions
export const trackChatMessage = (message: Omit<ChatMessage, 'conversationId' | 'timestamp' | 'messageLength' | 'containsSensitiveData'>) => 
  analytics.trackChatMessage(message);

export const trackInteraction = (interaction: Omit<UserInteraction, 'timestamp' | 'sessionId'>) => 
  analytics.trackInteraction(interaction);

export const startConversation = () => analytics.startConversation();
export const endConversation = () => analytics.endConversation();
export const trackError = (error: Error, context?: string) => analytics.trackError(error, context);
export const trackMetric = (name: string, value: number, properties?: Record<string, string>) => 
  analytics.trackMetric(name, value, properties);
export const trackPerformance = (metricName: string, duration: number) => 
  analytics.trackPerformance(metricName, duration);
export const trackDependency = (name: string, command: string, startTime: Date, duration: number, success: boolean) => 
  analytics.trackDependency(name, command, startTime, duration, success);