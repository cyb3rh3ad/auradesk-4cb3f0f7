import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

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

      // Listen for push notifications received
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        // Handle foreground notification - could show a toast or in-app alert
        this.handleForegroundNotification(notification);
      });

      // Listen for push notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        // Handle notification tap - navigate to relevant screen
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

  private handleForegroundNotification(notification: PushNotificationSchema): void {
    // Create a custom in-app notification or toast
    // For now, just log it - you can integrate with your toast system
    console.log('Foreground notification:', notification.title, notification.body);
    
    // Optional: Show a toast notification
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        title: notification.title || 'Notification',
        description: notification.body,
      });
    }
  }

  private handleNotificationAction(action: ActionPerformed): void {
    const data = action.notification.data;
    
    // Navigate based on notification data
    if (data?.type === 'message') {
      window.location.href = `/chat?conversation=${data.conversationId}`;
    } else if (data?.type === 'meeting') {
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
