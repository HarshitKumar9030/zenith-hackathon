package com.wasteright.helper;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.*;
import android.os.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.*;

public class TrackingService extends Service implements LocationListener {
    public static volatile boolean running=false;
    public static volatile String activeBookingId="";
    public static volatile boolean sessionEnded=false;
    public static volatile String status="Not sharing location.";
    private String server,token;
    private boolean hindi=false;
    private LocationManager locations;
    private final ExecutorService network=Executors.newSingleThreadExecutor();
    private final AtomicBoolean uploading=new AtomicBoolean(false);
    private long lastSent=0;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable expiry=()->{status=t("Session ended. Pair again.","सत्र समाप्त। फिर जोड़ें।");stopSelf();};
    private final Runnable heartbeat=new Runnable(){public void run(){
        if(!running)return;
        network.execute(()->{try{Api.post(server,new JSONObject().put("action","heartbeat"),token);}catch(Api.Failure e){if(e.status==401||e.status==403||e.status==409)handler.post(()->{status=t("Pickup or session ended.","संग्रह या सत्र समाप्त।");stopSelf();});}catch(Exception ignored){}});
        handler.postDelayed(this,15000);
    }};
    String t(String en,String hi){return hindi?hi:en;}
    @Override public IBinder onBind(Intent intent){return null;}
    Notification notice(){
        Intent open=new Intent(this,DashboardActivity.class);PendingIntent show=PendingIntent.getActivity(this,1,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop=PendingIntent.getService(this,2,new Intent(this,TrackingService.class).setAction("STOP"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(this,"pickup-location").setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle(t("Waste Right · Sharing pickup location","Waste Right · संग्रह स्थान साझा है")).setContentText(status).setContentIntent(show).setOngoing(true).setOnlyAlertOnce(true).addAction(new Notification.Action.Builder(null,t("Stop sharing","साझा करना रोकें"),stop).build()).build();
    }
    void update(String text){status=text;((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(77,notice());}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null){stopSelf();return START_NOT_STICKY;}
        if("STOP".equals(intent.getAction())){status=t("Sharing stopped.","साझा करना बंद है।");stopSelf();return START_NOT_STICKY;}
        if(running)return START_NOT_STICKY;
        server=intent.getStringExtra("server");token=intent.getStringExtra("token");hindi=intent.getBooleanExtra("hindi",false);
        if(server==null||token==null||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){stopSelf();return START_NOT_STICKY;}
        NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);nm.createNotificationChannel(new NotificationChannel("pickup-location","Active pickup location",NotificationManager.IMPORTANCE_LOW));
        status=t("Finding a fresh GPS fix…","ताज़ा GPS स्थान ढूँढ रहे हैं…");
        try{
            if(Build.VERSION.SDK_INT>=29)startForeground(77,notice(),ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);else startForeground(77,notice());
            running=true;activeBookingId=intent.getStringExtra("bookingId");locations=(LocationManager)getSystemService(LOCATION_SERVICE);
            boolean fine=checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED,requested=false;
            if(fine&&locations.isProviderEnabled(LocationManager.GPS_PROVIDER)){locations.requestLocationUpdates(LocationManager.GPS_PROVIDER,5000,2,this,Looper.getMainLooper());requested=true;}
            if(locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER)){locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,5000,2,this,Looper.getMainLooper());requested=true;}
            if(!requested)update(t("Enable phone Location in settings. No fix is being shared.","फ़ोन सेटिंग में स्थान चालू करें। अभी स्थान साझा नहीं है।"));
            if(!fine)update(t("Approximate location permission. Enable precise location for better accuracy.","अनुमति अनुमानित है। बेहतर सटीकता के लिए सटीक स्थान चुनें।"));
            handler.postDelayed(expiry,2*60*60*1000L);
            handler.postDelayed(heartbeat,15000);
        }catch(Exception error){status=t("Location permission or service is unavailable.","स्थान अनुमति या सेवा उपलब्ध नहीं है।");stopSelf();}
        return START_NOT_STICKY;
    }
    @Override public void onLocationChanged(Location location){
        if(!running||!location.hasAccuracy()||System.currentTimeMillis()-location.getTime()>30000||location.getAccuracy()<=0)return;
        if(SystemClock.elapsedRealtime()-lastSent<5000||!uploading.compareAndSet(false,true))return;
        lastSent=SystemClock.elapsedRealtime();
        final Location fix=new Location(location);final String auth=token,origin=server;
        network.execute(()->{
            try{
                JSONObject point=new JSONObject().put("action","update").put("latitude",fix.getLatitude()).put("longitude",fix.getLongitude()).put("accuracy",fix.getAccuracy()).put("timestamp",fix.getTime());
                Api.post(origin,point,auth);
                handler.post(()->{if(running)update(t("Sharing · reported accuracy ±","साझा है · सटीकता ±")+Math.round(fix.getAccuracy())+" m");});
            }catch(Api.Failure error){
                if(error.status==401||error.status==403||error.status==409){handler.post(()->{status=t("Pickup or session ended. Pair again if needed.","संग्रह या सत्र समाप्त। ज़रूरत हो तो फिर जोड़ें।");stopSelf();});}
                else handler.post(()->{if(running)update(t("Waiting for a fresh location or connection…","ताज़ा स्थान या नेटवर्क की प्रतीक्षा…"));});
            }catch(Exception error){handler.post(()->{if(running)update(t("Connection lost. Showing no new fix until reconnected.","नेटवर्क नहीं है। जुड़ने तक नया स्थान नहीं भेजा जाएगा।"));});}
            finally{uploading.set(false);}
        });
    }
    @Override public void onProviderDisabled(String provider){if(running)update(t("Location signal unavailable. Last fix may be stale.","स्थान सिग्नल नहीं है। पिछला स्थान पुराना हो सकता है।"));}
    @Override public void onProviderEnabled(String provider){}
    @Override public void onStatusChanged(String provider,int value,Bundle extras){}
    @Override public void onDestroy(){
        running=false;activeBookingId="";sessionEnded=true;if(!status.contains("ended")&&!status.contains("समाप्त")&&!status.contains("unavailable"))status=t("Sharing stopped. Pair again to restart.","साझा करना बंद है। फिर जोड़ें।");handler.removeCallbacksAndMessages(null);if(locations!=null)locations.removeUpdates(this);
        final String auth=token,origin=server;token=null;
        if(auth!=null&&origin!=null)network.execute(()->{try{Api.post(origin,new JSONObject().put("action","stop"),auth);}catch(Exception ignored){}});
        network.shutdown();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
}
