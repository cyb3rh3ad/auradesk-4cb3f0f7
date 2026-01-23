package app.lovable.fc4bd383e19d4e41b174125d10b92719;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create notification channels on app start
        createNotificationChannels();
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            
            // Create high-priority call channel with custom ringtone
            NotificationChannel callChannel = new NotificationChannel(
                "calls",
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            callChannel.setDescription("Notifications for incoming voice and video calls");
            callChannel.enableVibration(true);
            callChannel.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 500});
            callChannel.enableLights(true);
            callChannel.setLightColor(0xFF9b87f5);
            callChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            callChannel.setBypassDnd(true);
            
            // Set default sound for calls
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            callChannel.setSound(
                Uri.parse("android.resource://" + getPackageName() + "/raw/ringtone"),
                audioAttributes
            );
            
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
        }
    }
}
