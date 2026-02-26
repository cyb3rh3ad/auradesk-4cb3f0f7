import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

const isNative = Capacitor.isNativePlatform();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

class PushNotificationService {
  private initialized = false;
  private token: string | null = null;
  private onCallReceived: ((data: Record<string, string>) => void) | null = null;

  /** Register a callback for incoming call push notifications (foreground) */
  setCallHandler(handler: (data: Record<string, string>) => void) {
    this.onCallReceived = handler;
  }

  async initialize(): Promise<void> {
    if (!isNative || this.initialized) {
      console.log('Push notifications: Not a native platform or already initialized');
      return;
    }

    try {
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

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        this.token = token.value;
        await this.saveToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
      });

      // Foreground notification — if it's a call, trigger the in-app call UI
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received (foreground):', notification);
        const data = notification.data || {};
        
        if (data.type === 'call' && this.onCallReceived) {
          // Don't show OS notification — the app is open and the realtime
          // broadcast will handle the in-app call dialog
          this.onCallReceived(data);
          return;
        }

        this.handleForegroundNotification(notification);
      });

      // Notification tapped — navigate to the right screen
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        this.handleNotificationAction(action);
      });

      this.initialized = true;
      console.log('Push notifications initialized');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
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

  private handleForegroundNotification(notification: PushNotificationSchema): void {
    console.log('Foreground notification:', notification.title, notification.body);
    
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        title: notification.title || 'Notification',
        description: notification.body,
      });
    }
  }

  private handleNotificationAction(action: ActionPerformed): void {
    const data = action.notification.data;
    
    if (data?.type === 'call' && data?.conversationId) {
      // For calls, navigate to the chat and the realtime system picks up
      window.location.href = `/chat?conversation=${data.conversationId}&incoming_call=true`;
    } else if (data?.type === 'message' && data?.conversationId) {
      window.location.href = `/chat?conversation=${data.conversationId}`;
    } else if (data?.type === 'meeting' && data?.meetingId) {
      window.location.href = `/meetings?room=${data.meetingId}`;
    } else if (data?.type === 'team') {
      window.location.href = `/teams`;
    } else if (data?.type === 'help_request') {
      window.location.href = `/dashboard`;
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
}

export const pushNotificationService = new PushNotificationService();
