package com.wasteright.helper;
import java.io.*;
import java.net.*;
import org.json.*;
final class Api {
    static final class Failure extends Exception { final int status; Failure(int code,String message){super(message);status=code;} }
    static String origin(String value) throws Exception {
        URI u=new URI(value.trim());
        if(u.getHost()==null || u.getUserInfo()!=null || u.getQuery()!=null || u.getFragment()!=null || (!u.getPath().isEmpty()&&!u.getPath().equals("/"))) throw new Exception("Enter the server origin, without a path or account link.");
        if(!"https".equals(u.getScheme()) && !(BuildConfig.DEBUG&&"http".equals(u.getScheme()))) throw new Exception("Use HTTPS. HTTP is allowed only in a local debug build.");
        return new URI(u.getScheme(),null,u.getHost(),u.getPort(),null,null,null).toString();
    }
    static JSONObject post(String server,JSONObject data,String token) throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(server+"/api/tracking").openConnection();
        try {
            c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setRequestMethod("POST");c.setDoOutput(true);
            c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("User-Agent","WasteRightHelper/0.1 Android");
            if(token!=null)c.setRequestProperty("Authorization","Bearer "+token);
            byte[] bytes=data.toString().getBytes("UTF-8");c.setFixedLengthStreamingMode(bytes.length);
            try(OutputStream out=c.getOutputStream()){out.write(bytes);}
            int status=c.getResponseCode();InputStream raw=status<400?c.getInputStream():c.getErrorStream();
            StringBuilder text=new StringBuilder();if(raw!=null)try(BufferedReader r=new BufferedReader(new InputStreamReader(raw,"UTF-8"))){String line;while((line=r.readLine())!=null){text.append(line);if(text.length()>16000)throw new Exception("Unexpected server response.");}}
            JSONObject result;try{result=new JSONObject(text.toString());}catch(JSONException ex){throw new Exception("Server did not return a valid response. Check the app address.");}
            if(status<200||status>=300)throw new Failure(status,result.optString("error","Unable to continue."));
            return result;
        } finally {c.disconnect();}
    }
}
