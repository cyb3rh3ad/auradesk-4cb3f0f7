package app.lovable.fc4bd383e19d4e41b174125d10b92719;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class CallNotificationService extends FirebaseMessagingService {
    private static final String TAG = "CallNotificationService";
    private static final int CALL_NOTIFICATION_ID = 1001;
    private static final long RINGTONE_DURATION_MS = 30000; // 30 seconds
    
    private static MediaPlayer ringtonePlayer;
    private static Vibrator vibrator;
    private static Handler ringtoneHandler;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());
        
        Map<String, String> data = remoteMessage.getData();
        
        if (data.isEmpty()) {
            Log.d(TAG, "No data payload in message");
            return;
        }
        
        String type = data.get("type");
        Log.d(TAG, "Notification type: " + type);
        
        if ("call".equals(type)) {
            showCallNotification(data);
            startRingtone();
        } else {
            // For other notifications, show a standard notification
            showStandardNotification(data);
        }
    }
    
    private void startRingtone() {
        try {
            // Stop any existing ringtone
            stopRingtone();
            
            // Try to use custom ringtone first
            Uri ringtoneUri = null;
            int rawResId = getResources().getIdentifier("ringtone", "raw", getPackageName());
            
            if (rawResId != 0) {
                ringtoneUri = Uri.parse("android.resource://" + getPackageName() + "/raw/ringtone");
                Log.d(TAG, "Using custom ringtone");
            } else {
                // Fall back to default ringtone
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                Log.d(TAG, "Using default system ringtone");
            }
            
            // Create and start MediaPlayer
            ringtonePlayer = new MediaPlayer();
            ringtonePlayer.setDataSource(this, ringtoneUri);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            ringtonePlayer.setAudioAttributes(audioAttributes);
            ringtonePlayer.setLooping(true);
            ringtonePlayer.prepare();
            ringtonePlayer.start();
            
            Log.d(TAG, "Ringtone started");
            
            // Start vibration
            startVibration();
            
            // Auto-stop after timeout
            ringtoneHandler = new Handler(Looper.getMainLooper());
            ringtoneHandler.postDelayed(this::stopRingtone, RINGTONE_DURATION_MS);
            
        } catch (Exception e) {
            Log.e(TAG, "Error playing ringtone", e);
        }
    }
    
    private void startVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vibratorManager.getDefaultVibrator();
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 500, 250, 500, 250, 500, 250, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
                Log.d(TAG, "Vibration started");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting vibration", e);
        }
    }
    
    public static void stopRingtone() {
        try {
            if (ringtonePlayer != null) {
                if (ringtonePlayer.isPlaying()) {
                    ringtonePlayer.stop();
                }
                ringtonePlayer.release();
                ringtonePlayer = null;
                Log.d(TAG, "Ringtone stopped");
            }
            
            if (vibrator != null) {
                vibrator.cancel();
                vibrator = null;
            }
            
            if (ringtoneHandler != null) {
                ringtoneHandler.removeCallbacksAndMessages(null);
                ringtoneHandler = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping ringtone", e);
        }
    }
    
    private void showCallNotification(Map<String, String> data) {
        String title = data.get("notificationTitle");
        String body = data.get("notificationBody");
        String conversationId = data.get("conversationId");
        
        if (title == null) title = "Incoming Call";
        if (body == null) body = "Someone is calling you";
        
        // Create intent to open the app
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("conversationId", conversationId);
        intent.putExtra("type", "call");
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, flags
        );
        
        // Create accept action
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.setAction("ACCEPT_CALL");
        acceptIntent.putExtra("conversationId", conversationId);
        acceptIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent acceptPendingIntent = PendingIntent.getActivity(
            this, 1, acceptIntent, flags
        );
        
        // Create decline action - stops ringtone
        Intent declineIntent = new Intent(this, CallActionReceiver.class);
        declineIntent.setAction("DECLINE_CALL");
        declineIntent.putExtra("conversationId", conversationId);
        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
            this, 2, declineIntent, flags
        );
        
        // Build the notification - no sound here since we play it manually
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "calls")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(false)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_call, "Accept", acceptPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
            .setVibrate(null) // We handle vibration manually
            .setSound(null) // We handle sound manually
            .setFullScreenIntent(pendingIntent, true);
        
        // Show the notification
        NotificationManager notificationManager = 
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (notificationManager != null) {
            notificationManager.notify(CALL_NOTIFICATION_ID, builder.build());
            Log.d(TAG, "Call notification displayed");
        }
    }
    
    private void showStandardNotification(Map<String, String> data) {
        String title = data.get("notificationTitle");
        String body = data.get("notificationBody");
        
        if (title == null) title = "New Notification";
        if (body == null) body = "";
        
        // Create intent to open the app
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, flags
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "messages")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(Notification.DEFAULT_ALL);
        
        NotificationManager notificationManager = 
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (notificationManager != null) {
            notificationManager.notify((int) System.currentTimeMillis(), builder.build());
        }
    }
    
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token);
        // Token will be handled by the Capacitor plugin
    }
}
