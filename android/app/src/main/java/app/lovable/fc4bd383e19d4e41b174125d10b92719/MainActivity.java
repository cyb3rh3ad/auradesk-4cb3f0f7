package app.lovable.fc4bd383e19d4e41b174125d10b92719;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create notification channels on app start
        createNotificationChannels();
        
        // Handle incoming call intent
        handleIntent(getIntent());
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }
    
    private void handleIntent(Intent intent) {
        if (intent == null) return;
        
        String action = intent.getAction();
        Log.d(TAG, "Handling intent action: " + action);
        
        if ("ACCEPT_CALL".equals(action)) {
            // Stop ringtone when accepting
            CallNotificationService.stopRingtone();
            
            // Dismiss the call notification
            NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(1001);
            }
            
            // Wake up screen and bring to front
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            } else {
                getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            }
            
            String conversationId = intent.getStringExtra("conversationId");
            Log.d(TAG, "Accepting call for conversation: " + conversationId);
        }
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            
            // Create high-priority call channel
            NotificationChannel callChannel = new NotificationChannel(
                "calls",
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            callChannel.setDescription("Notifications for incoming voice and video calls");
            callChannel.enableVibration(false); // We handle vibration manually for looping
            callChannel.enableLights(true);
            callChannel.setLightColor(0xFF9b87f5);
            callChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            callChannel.setBypassDnd(true);
            callChannel.setSound(null, null); // We handle sound manually for looping
            
            notificationManager.createNotificationChannel(callChannel);
            
            // Create messages channel
            NotificationChannel messageChannel = new NotificationChannel(
                "messages",
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            messageChannel.setDescription("Notifications for new messages");
            messageChannel.enableVibration(true);
            messageChannel.enableLights(true);
            messageChannel.setLightColor(0xFF9b87f5);
            
            notificationManager.createNotificationChannel(messageChannel);
            
            // Create default channel
            NotificationChannel defaultChannel = new NotificationChannel(
                "default",
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            defaultChannel.setDescription("General notifications");
            
            notificationManager.createNotificationChannel(defaultChannel);
            
            Log.d(TAG, "Notification channels created");
        }
    }
}
