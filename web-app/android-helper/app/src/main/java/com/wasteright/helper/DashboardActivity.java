package com.wasteright.helper;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.util.concurrent.*;
import org.json.*;

/** Signed-in helper workspace. Only a top-frame, one-use code crosses into native GPS. */
public class DashboardActivity extends Activity {
    private static final String ORIGIN="https://wasteright.harshit.page";
    private WebView web;
    private LinearLayout root,tracking,offline,tabs;
    private TextView liveStatus;
    private ProgressBar progress;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final ExecutorService network=Executors.newSingleThreadExecutor();
    private String token,bookingId,selected="Helper dashboard",lastUrl=ORIGIN+"/app?native=android&auth=login&view=Helper%20dashboard";
    private boolean pairing=false,destroyed=false;
    private int generation=0;
    private boolean keyboardVisible=false,helperSignedIn=false;
    private GeolocationPermissions.Callback locationPermission;
    private String locationOrigin;
    private final Runnable tick=new Runnable(){public void run(){
        if(destroyed)return;
        tracking.setVisibility(TrackingService.running?View.VISIBLE:View.GONE);
        liveStatus.setText(TrackingService.status);
        if(trusted(web.getUrl())){
            web.evaluateJavascript("window.dispatchEvent(new CustomEvent('wasteright-native-tracking',{detail:"+new JSONObjectBuilder().status()+"}));",null);
            web.evaluateJavascript("document.querySelector('[data-helper-session=ready]') !== null",result->{if(!destroyed){helperSignedIn="true".equals(result);updateTabs();}});
        }
        handler.postDelayed(this,2000);
    }};
    private class JSONObjectBuilder {String status(){try{return new JSONObject().put("running",TrackingService.running).put("status",TrackingService.status).put("bookingId",TrackingService.activeBookingId).put("pending",pairing||token!=null).toString();}catch(Exception e){return "{}";}}}
    int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    boolean trusted(String url){if(url==null)return false;Uri u=Uri.parse(url);return "https".equals(u.getScheme())&&"wasteright.harshit.page".equals(u.getHost())&&(u.getPort()==-1||u.getPort()==443)&&u.getUserInfo()==null;}
    GradientDrawable background(String color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(Color.parseColor(color));d.setCornerRadius(dp(radius));return d;}
    TextView label(String s,int size,String color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(Color.parseColor(color));return t;}
    void updateTabs(){if(tabs!=null)tabs.setVisibility(helperSignedIn&&!keyboardVisible?View.VISIBLE:View.GONE);}
    boolean accountIntent(Intent intent){return intent!=null&&Intent.ACTION_VIEW.equals(intent.getAction())&&intent.getData()!=null&&trusted(intent.getData().toString())&&"/account".equals(intent.getData().getPath());}
    @Override public void onCreate(Bundle state){super.onCreate(state);
        if(accountIntent(getIntent()))lastUrl=getIntent().getData().toString();
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
        getWindow().setStatusBarColor(Color.parseColor("#F7F8F2"));getWindow().setNavigationBarColor(Color.parseColor("#F7F8F2"));getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.parseColor("#F7F8F2"));setContentView(root);
        root.setOnApplyWindowInsetsListener((v,i)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());android.graphics.Insets ime=i.getInsets(WindowInsets.Type.ime());keyboardVisible=i.isVisible(WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,ime.bottom));updateTabs();return WindowInsets.CONSUMED;}
            v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i.consumeSystemWindowInsets();
        });root.requestApplyInsets();
        if(Build.VERSION.SDK_INT<30)root.getViewTreeObserver().addOnGlobalLayoutListener(()->{android.graphics.Rect visible=new android.graphics.Rect();root.getWindowVisibleDisplayFrame(visible);keyboardVisible=root.getRootView().getHeight()-visible.bottom>dp(150);updateTabs();});
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);root.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        tracking=new LinearLayout(this);tracking.setGravity(Gravity.CENTER_VERTICAL);tracking.setPadding(dp(18),dp(10),dp(12),dp(10));tracking.setBackgroundColor(Color.parseColor("#E6EEDC"));
        liveStatus=label("Live location",12,"#204C38");tracking.addView(liveStatus,new LinearLayout.LayoutParams(0,-2,1));Button stop=new Button(this);stop.setText("Stop / रोकें");stop.setAllCaps(false);stop.setTextColor(Color.parseColor("#514486"));stop.setBackgroundColor(Color.TRANSPARENT);stop.setOnClickListener(v->stopTracking());tracking.addView(stop);root.addView(tracking);tracking.setVisibility(View.GONE);
        FrameLayout content=new FrameLayout(this);root.addView(content,new LinearLayout.LayoutParams(-1,0,1));web=new WebView(this);content.addView(web,new FrameLayout.LayoutParams(-1,-1));
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);settings.setGeolocationEnabled(true);settings.setMediaPlaybackRequiresUserGesture(true);settings.setUserAgentString(settings.getUserAgentString()+" WasteRightHelper/0.3");
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        offline=new LinearLayout(this);offline.setOrientation(LinearLayout.VERTICAL);offline.setGravity(Gravity.CENTER);offline.setPadding(dp(28),dp(30),dp(28),dp(30));offline.setBackgroundColor(Color.parseColor("#F7F8F2"));offline.addView(label("Let’s reconnect.",28,"#173F30"));TextView help=label("Check your connection, then try again.\nअपना इंटरनेट जाँचें और फिर कोशिश करें।",15,"#6E7E72");help.setGravity(Gravity.CENTER);help.setPadding(0,dp(16),0,dp(20));offline.addView(help);Button retry=new Button(this);retry.setText("Try again / फिर प्रयास करें");retry.setAllCaps(false);retry.setBackground(background("#6559A3",18));retry.setTextColor(Color.WHITE);retry.setOnClickListener(v->{offline.setVisibility(View.GONE);web.loadUrl(lastUrl);});offline.addView(retry);content.addView(offline,new FrameLayout.LayoutParams(-1,-1));offline.setVisibility(View.GONE);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri u=request.getUrl();
                if("wasteright-track".equals(u.getScheme())){
                    if(request.isForMainFrame()&&trusted(view.getUrl())){
                        if("start".equals(u.getHost()))pair(u.getQueryParameter("code"));
                        if("stop".equals(u.getHost()))stopTracking();
                    }return true;
                }
                if(trusted(u.toString()))return false;
                if(request.isForMainFrame()&&("https".equals(u.getScheme())||"mailto".equals(u.getScheme())||"geo".equals(u.getScheme())))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}
                return true;
            }
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){if(!trusted(url)){v.stopLoading();return;}lastUrl=url;progress.setVisibility(View.VISIBLE);}
            @Override public void onPageFinished(WebView v,String url){progress.setVisibility(View.GONE);CookieManager.getInstance().flush();}
            @Override public void onReceivedError(WebView v,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()){offline.setVisibility(View.VISIBLE);progress.setVisibility(View.GONE);}}
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest request,WebResourceResponse response){if(request.isForMainFrame()&&response.getStatusCode()>=500){offline.setVisibility(View.VISIBLE);progress.setVisibility(View.GONE);}}
            @Override public void onReceivedSslError(WebView v,android.webkit.SslErrorHandler h,android.net.http.SslError e){h.cancel();offline.setVisibility(View.VISIBLE);}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView v,int value){progress.setProgress(value);}
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                if(!trusted(origin)||!trusted(web.getUrl())){callback.invoke(origin,false,false);return;}
                if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);return;}
                if(locationPermission!=null)locationPermission.invoke(locationOrigin,false,false);
                locationPermission=callback;locationOrigin=origin;requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},22);
            }
            @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
        });
        tabs=new LinearLayout(this);tabs.setPadding(dp(10),dp(8),dp(10),dp(8));String[] names={"Home","Collections","Earnings","Area"},views={"Helper dashboard","Helper collections","Helper earnings","Service area"};
        for(int n=0;n<names.length;n++){final int index=n;LinearLayout tab=new LinearLayout(this);tab.setOrientation(LinearLayout.VERTICAL);tab.setGravity(Gravity.CENTER);tab.setPadding(0,dp(5),0,dp(5));tab.addView(new TabIcon(n),new LinearLayout.LayoutParams(dp(25),dp(25)));TextView caption=label(names[n],11,"#204C38");caption.setPadding(0,dp(5),0,0);tab.addView(caption);tab.setContentDescription(names[n]);tab.setFocusable(true);tab.setOnClickListener(v->{selected=views[index];if(trusted(web.getUrl())&&"/app".equals(Uri.parse(web.getUrl()).getPath()))web.evaluateJavascript("window.dispatchEvent(new CustomEvent('wasteright-native-navigate',{detail:"+JSONObject.quote(selected)+"}));",null);else web.loadUrl(ORIGIN+"/app?native=android&view="+Uri.encode(selected));for(int j=0;j<tabs.getChildCount();j++)tabs.getChildAt(j).setBackground(j==index?background("#E8EDDF",20):null);});tabs.addView(tab,new LinearLayout.LayoutParams(0,dp(65),1));}tabs.getChildAt(0).setBackground(background("#E8EDDF",20));root.addView(tabs);updateTabs();
        web.loadUrl(lastUrl);
    }
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);if(accountIntent(intent)){setIntent(intent);offline.setVisibility(View.GONE);web.loadUrl(intent.getData().toString());}}
    private class TabIcon extends View {int kind;Paint p=new Paint(3);TabIcon(int k){super(DashboardActivity.this);kind=k;}@Override protected void onDraw(Canvas c){super.onDraw(c);c.scale(getWidth()/24f,getHeight()/24f);p.setColor(Color.parseColor("#315C45"));p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.7f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);Path path=new Path();if(kind==0){path.moveTo(3,10);path.lineTo(12,3);path.lineTo(21,10);path.lineTo(21,21);path.lineTo(15,21);path.lineTo(15,14);path.lineTo(9,14);path.lineTo(9,21);path.lineTo(3,21);path.close();c.drawPath(path,p);}else if(kind==1){c.drawRoundRect(4,4,20,21,3,3,p);c.drawLine(9,3,15,3,p);c.drawLine(8,10,16,10,p);c.drawLine(8,15,16,15,p);}else if(kind==3){c.drawCircle(12,9,5,p);c.drawLine(8,13,12,21,p);c.drawLine(12,21,16,13,p);c.drawCircle(12,9,1.4f,p);}else{c.drawRoundRect(3,5,21,20,3,3,p);c.drawRoundRect(13,10,22,16,2,2,p);c.drawCircle(16,13,0.7f,p);}}}
    void pair(String code){if(pairing||destroyed)return;if(TrackingService.running){Toast.makeText(this,"Stop the active pickup before sharing another.",Toast.LENGTH_LONG).show();return;}if(code==null||!code.matches("[a-f0-9]{24}"))return;pairing=true;final int attempt=++generation;
        network.execute(()->{try{JSONObject data=Api.post(ORIGIN,new JSONObject().put("action","pair").put("code",code),null);String pendingToken=data.getString("token"),pendingBooking=data.getString("bookingId");runOnUiThread(()->{if(attempt!=generation||destroyed){revoke(pendingToken);return;}pairing=false;token=pendingToken;bookingId=pendingBooking;permissions();});}catch(Exception e){runOnUiThread(()->{if(attempt!=generation)return;pairing=false;if(!destroyed)Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();});}});
    }
    void permissions(){if(token==null)return;if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},20);return;}if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},21);return;}begin();}
    @Override public void onRequestPermissionsResult(int request,String[] names,int[] results){super.onRequestPermissionsResult(request,names,results);if(request==22){if(locationPermission!=null){locationPermission.invoke(locationOrigin,checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED,false);locationPermission=null;}return;}if(request==20&&checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED)permissions();else if(request==21&&(Build.VERSION.SDK_INT<33||checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED))begin();else{discardToken();Toast.makeText(this,"Location and notification permission are needed to share visibly. / स्थान और सूचना की अनुमति चाहिए।",Toast.LENGTH_LONG).show();}}
    void begin(){if(token==null||!hasWindowFocus()||isFinishing())return;if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED||(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED))return;try{TrackingService.sessionEnded=false;startForegroundService(new Intent(this,TrackingService.class).putExtra("server",ORIGIN).putExtra("token",token).putExtra("bookingId",bookingId));token=null;}catch(Exception e){discardToken();Toast.makeText(this,"Return to the app and try sharing again.",Toast.LENGTH_LONG).show();}}
    @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused&&token!=null)begin();}
    void stopTracking(){generation++;pairing=false;discardToken();stopService(new Intent(this,TrackingService.class));}
    void revoke(String value){CompletableFuture.runAsync(()->{try{Api.post(ORIGIN,new JSONObject().put("action","stop"),value);}catch(Exception ignored){}});}
    void discardToken(){if(token!=null){revoke(token);token=null;}}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onResume(){super.onResume();handler.removeCallbacks(tick);handler.post(tick);}
    @Override protected void onPause(){super.onPause();handler.removeCallbacks(tick);CookieManager.getInstance().flush();}
    @Override protected void onDestroy(){destroyed=true;generation++;if(locationPermission!=null){locationPermission.invoke(locationOrigin,false,false);locationPermission=null;}discardToken();handler.removeCallbacks(tick);network.shutdown();web.destroy();super.onDestroy();}
}
