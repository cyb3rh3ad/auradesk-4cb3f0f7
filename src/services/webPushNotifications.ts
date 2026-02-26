import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

class WebPushService {
  private vapidPublicKey: string | null = null;
  private subscription: PushSubscription | null = null;
  private initialized = false;

  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) return false;
    if (!('serviceWorker' in navigator)) return false;
    if (!('PushManager' in window)) return false;
    if (!('Notification' in window)) return false;
    return true;
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      // Fetch VAPID key from backend
      const { data, error } = await supabase.functions.invoke('web-push-vapid');
      if (error || !data?.publicKey) {
        console.error('[WebPush] Failed to fetch VAPID key:', error);
        return false;
      }
      this.vapidPublicKey = data.publicKey;
      console.log('[WebPush] VAPID key fetched');

      // Ensure service worker is registered and ready
      // On mobile, navigator.serviceWorker.ready can take time — add a timeout
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 8000))
      ]) as ServiceWorkerRegistration;

      if (!registration) {
        console.error('[WebPush] Service worker not ready');
        return false;
      }

      this.subscription = await (registration as any).pushManager.getSubscription();

      if (this.subscription) {
        console.log('[WebPush] Existing subscription found, syncing to DB');
        await this.saveSubscription(this.subscription);
      }

      this.initialized = true;
      return true;
    } catch (err) {
      console.error('[WebPush] Init error:', err);
      return false;
    }
  }

  async requestPermissionAndSubscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;

    // Initialize if needed
    if (!this.vapidPublicKey) {
      const ok = await this.initialize();
      if (!ok) return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[WebPush] Permission result:', permission);
      if (permission !== 'granted') return false;

      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey!);

      // Unsubscribe existing to force fresh subscription
      const existing = await (registration as any).pushManager.getSubscription();
      if (existing) {
        console.log('[WebPush] Removing stale subscription');
        await existing.unsubscribe();
      }

      this.subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log('[WebPush] New subscription created:', this.subscription.endpoint);
      await this.saveSubscription(this.subscription);
      return true;
    } catch (err) {
      console.error('[WebPush] Subscribe error:', err);
      return false;
    }
  }

  async refreshSubscription(): Promise<void> {
    if (!this.isSupported()) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await (registration as any).pushManager.getSubscription();
      if (this.subscription) {
        await this.saveSubscription(this.subscription);
      }
    } catch {}
  }

  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const subJson = subscription.toJSON();
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    // Delete old subscriptions for this user first, then insert fresh
    // This avoids upsert issues
    try {
      await supabase
        .from('web_push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .neq('endpoint', subscription.endpoint);
    } catch {}

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
      console.error('[WebPush] Error saving subscription:', error);
      // Fallback: delete and re-insert
      await supabase
        .from('web_push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      const { error: insertError } = await supabase
        .from('web_push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        });

      if (insertError) {
        console.error('[WebPush] Fallback insert also failed:', insertError);
      } else {
        console.log('[WebPush] Subscription saved via fallback');
      }
    } else {
      console.log('[WebPush] Subscription saved');
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('web_push_subscriptions')
          .delete()
          .eq('user_id', user.id);
      }
    }
  }

  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  isInitializedState(): boolean {
    return this.initialized;
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
