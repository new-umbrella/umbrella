package com.rnintercept;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Native module that buffers intercepted URLs per WebView (viewId).
 * Exposes:
 *  - getName(): module name "NativeInterceptBuffer"
 *  - getRecent(viewId, n): Promise<string[]>
 *  - subscribe(viewId): registers interest on native side (no-op but tracked)
 *  - unsubscribe(viewId): unregister
 *
 * Native code should call addMatch(viewId, url) to record a match; this module
 * will buffer it and emit an event "NativeInterceptBuffer" { viewId, url } to JS
 * only for subscribed viewIds (to avoid unnecessary traffic).
 */
public class NativeInterceptBufferModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    // viewId -> recent URL list (thread-safe)
    private final ConcurrentHashMap<Integer, CopyOnWriteArrayList<String>> bufferMap = new ConcurrentHashMap<>();

    // viewId -> subscribed flag
    private final ConcurrentHashMap<Integer, Boolean> subscribers = new ConcurrentHashMap<>();

    // max buffer size per view
    private final int MAX_BUFFER = 200;

    public NativeInterceptBufferModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "NativeInterceptBuffer";
    }

    /**
     * Called by native managers to record a matched URL.
     * This method is NOT exposed to JS (internal), but left public so managers can call it.
     */
    public void addMatch(int viewId, String url) {
        try {
            if (url == null) return;
            CopyOnWriteArrayList<String> list = bufferMap.get(viewId);
            if (list == null) {
                list = new CopyOnWriteArrayList<>();
                bufferMap.put(viewId, list);
            }
            // push at head
            list.add(0, url);
            // trim
            while (list.size() > MAX_BUFFER) {
                try { list.remove(list.size() - 1); } catch (Throwable ignored) {}
            }

            // If subscribed, emit event to JS
            Boolean sub = subscribers.get(viewId);
            if (sub != null && sub) {
                try {
                    WritableMap map = Arguments.createMap();
                    map.putInt("viewId", viewId);
                    map.putString("url", url);
                    reactContext
                      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                      .emit("NativeInterceptBuffer", map);
                } catch (Throwable t) {
                    try { android.util.Log.i("NativeInterceptBuffer", "emit failed: " + t.getMessage()); } catch (Throwable ignored) {}
                }
            }
        } catch (Throwable t) {
            try { android.util.Log.i("NativeInterceptBuffer", "addMatch error: " + t.getMessage()); } catch (Throwable ignored) {}
        }
    }

    /**
     * JS-callable: subscribe to events for a viewId. JS should add a DeviceEventEmitter listener
     * for "NativeInterceptBuffer" to receive events as { viewId, url }.
     */
    @ReactMethod
    public void subscribe(int viewId) {
        subscribers.put(viewId, true);
    }

    @ReactMethod
    public void unsubscribe(int viewId) {
        subscribers.remove(viewId);
    }

    /**
     * JS-callable: returns the most recent up to 'n' URLs for a viewId.
     */
    @ReactMethod
    public void getRecent(int viewId, int n, Promise promise) {
        try {
            CopyOnWriteArrayList<String> list = bufferMap.get(viewId);
            WritableArray arr = Arguments.createArray();
            if (list != null && n > 0) {
                int limit = Math.min(n, list.size());
                for (int i = 0; i < limit; i++) {
                    try { arr.pushString(list.get(i)); } catch (Throwable ignored) {}
                }
            }
            promise.resolve(arr);
        } catch (Throwable t) {
            promise.reject("ERR_BUFFER", t.getMessage());
        }
    }
}