package com.wasteright.helper;
import android.Manifest;
import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.provider.Settings;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import java.util.concurrent.*;
import org.json.*;

public class MainActivity extends Activity {
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private LinearLayout root;
    private EditText server,code;
    private TextView status,job;
    private Button pair,start,stop;
    private boolean hindi=false,busy=false;
    private String endpoint="",token=null,bookingId="",item="";
    private final Runnable refresh=new Runnable(){public void run(){
        if(TrackingService.sessionEnded)token=null;
        if(status!=null){status.setText(TrackingService.status);start.setEnabled(!busy&&token!=null&&!TrackingService.running);pair.setEnabled(!busy&&!TrackingService.running);stop.setEnabled(TrackingService.running);}
        ui.postDelayed(this,1000);
    }};
    @Override public void onCreate(Bundle b){super.onCreate(b);hindi=getPreferences(0).getBoolean("hindi",false);draw();}
    String t(String en,String hi){return hindi?hi:en;}
    int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
    GradientDrawable bg(String color,int radius){GradientDrawable g=new GradientDrawable();g.setColor(Color.parseColor(color));g.setCornerRadius(dp(radius));return g;}
    TextView text(String value,int size,String color,boolean bold){TextView v=new TextView(this);v.setText(value);v.setTextSize(size);v.setTextColor(Color.parseColor(color));if(bold)v.setTypeface(Typeface.DEFAULT,Typeface.BOLD);v.setLineSpacing(dp(3),1);return v;}
    void gap(LinearLayout parent,int amount){View space=new View(this);parent.addView(space,new LinearLayout.LayoutParams(1,dp(amount)));}
    LinearLayout card(String color){LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(23),dp(24),dp(23),dp(24));box.setBackground(bg(color,24));root.addView(box,new LinearLayout.LayoutParams(-1,-2));return box;}
    Button button(LinearLayout parent,String label,boolean primary){Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextSize(14);b.setTextColor(Color.parseColor(primary?"#FFFFFF":"#315C45"));b.setBackground(bg(primary?"#6559A3":"#E6ECDD",15));b.setMinHeight(dp(51));b.setElevation(0);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(53));p.topMargin=dp(13);parent.addView(b,p);return b;}
    EditText input(LinearLayout parent,String label,String hint){parent.addView(text(label,12,"#43614E",true));gap(parent,8);EditText e=new EditText(this);e.setTextSize(14);e.setSingleLine(true);e.setPadding(dp(15),dp(12),dp(15),dp(12));e.setTextColor(Color.parseColor("#173F30"));e.setHintTextColor(Color.parseColor("#859182"));e.setHint(hint);e.setBackground(bg("#F2F5ED",14));parent.addView(e,new LinearLayout.LayoutParams(-1,dp(52)));return e;}
    void draw(){
        String savedServer=server!=null?server.getText().toString():getPreferences(0).getString("server","");String savedCode=code!=null?code.getText().toString():"";
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(Color.parseColor("#F7F8F2"));root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(24),dp(28),dp(24),dp(30));scroll.addView(root);setContentView(scroll);
        // Preserve safe-area padding on devices that enforce edge-to-edge layouts.
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(dp(24),dp(28)+insets.getSystemWindowInsetTop(),dp(24),dp(30)+insets.getSystemWindowInsetBottom());return insets;});root.requestApplyInsets();
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);TextView brand=text("Waste Right.",24,"#173F30",true);top.addView(brand,new LinearLayout.LayoutParams(0,-2,1));Button language=new Button(this);language.setText(hindi?"English":"हिन्दी");language.setAllCaps(false);language.setTextColor(Color.parseColor("#6559A3"));language.setBackgroundColor(Color.TRANSPARENT);top.addView(language);root.addView(top);language.setOnClickListener(v->{hindi=!hindi;getPreferences(0).edit().putBoolean("hindi",hindi).apply();draw();});
        gap(root,28);root.addView(text(t("Your pickup,\nwithin reach.","आपका संग्रह,\nआपके साथ।"),32,"#173F30",true));gap(root,12);root.addView(text(t("Share your route with the resident for one assigned pickup.","एक सौंपे गए संग्रह के निवासी के साथ अपना स्थान साझा करें।"),14,"#74816F",false));gap(root,27);
        LinearLayout connection=card("#FFFFFF");connection.addView(text(t("01  Pair your pickup","01  संग्रह जोड़ें"),17,"#173F30",true));gap(connection,20);
        server=input(connection,t("Waste Right server","Waste Right सर्वर"),"https://your-waste-right-app.example");server.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);server.setText(savedServer);gap(connection,18);
        code=input(connection,t("One-use pairing code","एक बार उपयोग का कोड"),t("Paste the code from Helper collections","Helper collections का कोड पेस्ट करें"));code.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);code.setText(savedCode);
        pair=button(connection,t("Pair pickup","संग्रह जोड़ें"),true);pair.setOnClickListener(v->pair());job=text(item.isEmpty()?t("Get a code from your assigned pickup in the web app.","वेब ऐप में अपने सौंपे गए संग्रह से कोड लें।"):item,12,"#74816F",false);gap(connection,15);connection.addView(job);gap(root,18);
        LinearLayout share=card("#EAF0E2");share.addView(text(t("02  Choose when to share","02  साझा करने का समय चुनें"),17,"#173F30",true));gap(share,13);share.addView(text(t("Only this pickup’s resident can view your shared location. Sharing continues when minimised, with a visible notification. Stop here or from that notification.","केवल इस संग्रह का निवासी आपका स्थान देख सकता है। ऐप छोटा करने पर सूचना के साथ साझा करना जारी रहता है। यहाँ या सूचना से रोकें।"),13,"#667861",false));
        gap(share,17);status=text(TrackingService.status,14,"#3D674A",true);share.addView(status);start=button(share,t("Start sharing location","स्थान साझा करें"),true);start.setOnClickListener(v->permissions());stop=button(share,t("Stop sharing","साझा करना बंद करें"),false);stop.setOnClickListener(v->{stopService(new Intent(this,TrackingService.class));token=null;TrackingService.status=t("Sharing stopped. Pair again to restart.","साझा करना बंद है। फिर जोड़ें।");});
        Button settings=button(share,t("Location settings","स्थान सेटिंग"),false);settings.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)));gap(root,22);
        root.addView(text(t("GPS accuracy is reported by your phone. Buildings, signal, battery settings and connectivity affect it. This app does not guarantee Find My precision. Pairing expires in five minutes; a tracking session lasts up to two hours and ends when the pickup leaves Assigned.","सटीकता फ़ोन GPS पर निर्भर है। इमारतें, सिग्नल, बैटरी और नेटवर्क इसे प्रभावित करते हैं। Find My जैसी सटीकता की गारंटी नहीं है। कोड 5 मिनट में समाप्त होता है। सत्र अधिकतम 2 घंटे या सक्रिय संग्रह तक है।"),11,"#81907B",false));
        start.setEnabled(token!=null&&!TrackingService.running);stop.setEnabled(TrackingService.running);pair.setEnabled(!busy&&!TrackingService.running);
    }
    void pair(){
        if(busy||TrackingService.running)return;String origin,entered=code.getText().toString().replace(" ","").trim().toLowerCase();
        if(!entered.matches("[a-f0-9]{24}")){job.setText(t("Paste the complete 24-character pairing code.","पूरा 24-अक्षर कोड पेस्ट करें।"));return;}
        try{origin=Api.origin(server.getText().toString());}catch(Exception e){job.setText(e.getMessage());return;}
        busy=true;pair.setEnabled(false);endpoint=origin;job.setText(t("Pairing…","जोड़ रहे हैं…"));
        worker.execute(()->{try{
            JSONObject data=Api.post(origin,new JSONObject().put("action","pair").put("code",entered),null);
            runOnUiThread(()->{TrackingService.sessionEnded=false;token=data.optString("token");bookingId=data.optString("bookingId");item=data.optString("item","Assigned pickup");code.setText("");getPreferences(0).edit().putString("server",origin).apply();job.setText(t("Paired: ","जुड़ गया: ")+item);TrackingService.status=t("Ready. Location is not being shared yet.","तैयार। स्थान अभी साझा नहीं है।");busy=false;pair.setEnabled(true);start.setEnabled(true);});
        }catch(Exception e){runOnUiThread(()->{busy=false;job.setText(e.getMessage());pair.setEnabled(true);});}});
    }
    void permissions(){
        if(token==null||TrackingService.running)return;
        if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},20);return;}
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},21);return;}
        begin();
    }
    @Override public void onRequestPermissionsResult(int request,String[] names,int[] results){super.onRequestPermissionsResult(request,names,results);
        if(request==20){if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED)permissions();else status.setText(t("Location permission is needed. Nothing is shared.","स्थान की अनुमति चाहिए। अभी साझा नहीं है।"));}
        // If notification permission is declined, do not start sharing silently.
        if(request==21){if(Build.VERSION.SDK_INT<33||checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)begin();else status.setText(t("Allow notifications to keep sharing visible, then tap Start.","साझा करना दिखाई देने के लिए सूचना अनुमति दें, फिर शुरू करें।"));}
    }
    void begin(){if(token==null||!hasWindowFocus())return;try{Intent i=new Intent(this,TrackingService.class).putExtra("server",endpoint).putExtra("token",token).putExtra("bookingId",bookingId).putExtra("hindi",hindi);startForegroundService(i);}catch(Exception e){status.setText(t("Return to the app and try Start again.","ऐप में लौटें और फिर शुरू करें।"));}}
    @Override protected void onResume(){super.onResume();ui.removeCallbacks(refresh);ui.post(refresh);}
    @Override protected void onPause(){super.onPause();ui.removeCallbacks(refresh);}
    @Override protected void onDestroy(){ui.removeCallbacks(refresh);worker.shutdown();super.onDestroy();}
}
