import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

class WebPushService {
  private vapidPublicKey: string | null = null;
  private subscription: PushSubscription | null = null;
  private initialized = false;

  // Check if Web Push is supported in this browser
  isSupported(): boolean {
    // Don't use web push on native platforms (they use FCM directly)
    if (Capacitor.isNativePlatform()) return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported() || this.initialized) return this.initialized;

    try {
      // Fetch VAPID public key from edge function
      const { data, error } = await supabase.functions.invoke('web-push-vapid');
      if (error || !data?.publicKey) {
        console.error('Failed to fetch VAPID key:', error);
        return false;
      }
      this.vapidPublicKey = data.publicKey;
      
      // Check if already subscribed
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await (registration as any).pushManager.getSubscription();
      
      if (this.subscription) {
        // Already subscribed, ensure it's saved
        await this.saveSubscription(this.subscription);
        this.initialized = true;
        return true;
      }

      this.initialized = true;
      return true;
    } catch (err) {
      console.error('Web push init error:', err);
      return false;
    }
  }

  async requestPermissionAndSubscribe(): Promise<boolean> {
    if (!this.isSupported() || !this.vapidPublicKey) {
      console.log('Web push not supported or not initialized');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key from base64url to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      this.subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log('Web push subscription created:', this.subscription.endpoint);

      // Save subscription to database
      await this.saveSubscription(this.subscription);
      return true;
    } catch (err) {
      console.error('Web push subscribe error:', err);
      return false;
    }
  }

  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const subJson = subscription.toJSON();
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    const { error } = await supabase
      .from('web_push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('Error saving web push subscription:', error);
    } else {
      console.log('Web push subscription saved');
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.subscription) {
      const endpoint = this.subscription.endpoint;
      await this.subscription.unsubscribe();
      this.subscription = null;

      // Remove from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('web_push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
      }
    }
  }

  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const webPushService = new WebPushService();
