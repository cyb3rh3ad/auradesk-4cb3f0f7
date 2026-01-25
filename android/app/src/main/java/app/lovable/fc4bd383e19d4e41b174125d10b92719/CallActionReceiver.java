package app.lovable.fc4bd383e19d4e41b174125d10b92719;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class CallActionReceiver extends BroadcastReceiver {
    private static final String TAG = "CallActionReceiver";
    private static final int CALL_NOTIFICATION_ID = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received action: " + action);

        if ("DECLINE_CALL".equals(action)) {
            // Stop ringtone and vibration
            CallNotificationService.stopRingtone();
            
            // Dismiss the notification
            NotificationManager notificationManager = 
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(CALL_NOTIFICATION_ID);
            }
            
            Log.d(TAG, "Call declined, notification dismissed");
        }
    }
}
