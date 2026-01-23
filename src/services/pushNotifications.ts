import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionsUrl } from '@/lib/supabase-config';

// Check if we're on a native platform
const isNative = Capacitor.isNativePlatform();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

class PushNotificationService {
  private initialized = false;
  private token: string | null = null;

  async initialize(): Promise<void> {
    if (!isNative || this.initialized) {
      console.log('Push notifications: Not a native platform or already initialized');
      return;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }
      } else if (permStatus.receive !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        this.token = token.value;
        await this.saveToken(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
      });

      // Listen for push notifications received (foreground)
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        this.handleForegroundNotification(notification);
      });

      // Listen for push notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        this.handleNotificationAction(action);
      });

      this.initialized = true;
      console.log('Push notifications initialized');
      
      // Create notification channels for Android (important for background notifications)
      this.createNotificationChannels();
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private async createNotificationChannels(): Promise<void> {
    try {
      // Import LocalNotifications for creating channels
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Create high-priority call channel
      await LocalNotifications.createChannel({
        id: 'calls',
        name: 'Incoming Calls',
        description: 'Notifications for incoming voice and video calls',
        importance: 5, // Max importance for heads-up notifications
        visibility: 1, // Public visibility
        sound: 'ringtone.wav',
        vibration: true,
        lights: true,
        lightColor: '#9b87f5',
      });

      // Create messages channel
      await LocalNotifications.createChannel({
        id: 'messages',
        name: 'Messages',
        description: 'Notifications for new messages',
        importance: 4, // High importance
        visibility: 1,
        sound: 'default',
        vibration: true,
      });

      console.log('Notification channels created');
    } catch (error) {
      console.warn('Could not create notification channels:', error);
    }
  }

  private async saveToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user logged in, cannot save push token');
        return;
      }

      const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

      // Upsert the token (insert or update if exists)
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          { user_id: user.id, token, platform },
          { onConflict: 'user_id,token' }
        );

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  private async handleForegroundNotification(notification: PushNotificationSchema): Promise<void> {
    console.log('Foreground notification:', notification.title, notification.body);
    
    const data = notification.data as Record<string, string> | undefined;
    const notificationType = data?.type;
    
    // For call notifications in foreground, trigger the in-app call UI
    if (notificationType === 'call') {
      // The CallContext will handle showing the incoming call dialog
      // Dispatch a custom event that CallContext listens for
      window.dispatchEvent(new CustomEvent('incoming-call-notification', {
        detail: {
          conversationId: data?.conversationId,
          conversationName: data?.conversationName,
          callerName: data?.notificationBody?.replace(' is calling you', '') || 'Unknown',
          isVideo: data?.isVideo === 'true',
        }
      }));
      return;
    }
    
    // Show in-app toast notification for other types
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        title: notification.title || 'Notification',
        description: notification.body,
      });
    }
  }

  private handleNotificationAction(action: ActionPerformed): void {
    const data = action.notification.data;
    const actionId = action.actionId;
    
    console.log('Notification action:', actionId, 'data:', data);

    // Handle quick reply action
    if (actionId === 'reply' && data?.conversationId) {
      const replyText = (action as any).inputValue;
      if (replyText) {
        this.sendQuickReply(data.conversationId, replyText);
        return;
      }
    }

    // Handle call accept/decline
    if (actionId === 'accept_call' && data?.callId) {
      window.location.href = `/chat?call=${data.callId}`;
      return;
    }

    if (actionId === 'decline_call' && data?.callId) {
      // Just dismiss the notification
      return;
    }

    // Navigate based on notification data
    if (data?.type === 'message' && data?.conversationId) {
      window.location.href = `/chat?conversation=${data.conversationId}`;
    } else if (data?.type === 'call' && data?.callId) {
      window.location.href = `/chat?call=${data.callId}`;
    } else if (data?.type === 'meeting' && data?.meetingId) {
      window.location.href = `/meetings?room=${data.meetingId}`;
    } else if (data?.type === 'team') {
      window.location.href = `/teams`;
    } else if (data?.type === 'help_request') {
      window.location.href = `/dashboard`;
    }
  }

  private async sendQuickReply(conversationId: string, message: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: message,
      });

      console.log('Quick reply sent successfully');
    } catch (error) {
      console.error('Error sending quick reply:', error);
    }
  }

  async removeToken(): Promise<void> {
    if (!this.token) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', this.token);

      this.token = null;
      console.log('Push token removed');
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Send push notification to a user
  async sendNotification(payload: {
    userId?: string;
    userIds?: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session, cannot send push notification');
        return;
      }

      const response = await fetch(`${getSupabaseFunctionsUrl()}/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to send push notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Helper methods for specific notification types
  async sendMessageNotification(
    recipientUserId: string,
    senderName: string,
    message: string,
    conversationId: string
  ): Promise<void> {
    await this.sendNotification({
      userId: recipientUserId,
      title: senderName,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      data: {
        type: 'message',
        conversationId,
        senderId: (await supabase.auth.getUser()).data.user?.id || '',
      },
    });
  }

  async sendCallNotification(
    recipientUserId: string,
    callerName: string,
    callId: string,
    isVideo: boolean
  ): Promise<void> {
    await this.sendNotification({
      userId: recipientUserId,
      title: `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
      body: `${callerName} is calling you`,
      data: {
        type: 'call',
        callId,
        callerName,
        isVideo: isVideo.toString(),
      },
    });
  }

  async sendTeamCallNotification(
    recipientUserIds: string[],
    callerName: string,
    teamName: string,
    channelId: string
  ): Promise<void> {
    await this.sendNotification({
      userIds: recipientUserIds,
      title: `${teamName}`,
      body: `${callerName} started a voice chat`,
      data: {
        type: 'team_call',
        channelId,
        teamName,
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
