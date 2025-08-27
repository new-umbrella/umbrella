package com.rnintercept;

import android.annotation.TargetApi;
import android.os.Build;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.MapBuilder;
import com.reactnativecommunity.webview.RNCWebViewClient;
import com.reactnativecommunity.webview.RNCWebViewManager;
import com.reactnativecommunity.webview.RNCWebViewWrapper;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import java.util.List;
import java.util.ArrayList;
import java.util.regex.Pattern;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * RNC-based WebView manager that intercepts requests and emits events to JS.
 * Supports a per-view "filterRegexes" prop (array of strings) — only requests that match
 * any of the passed regexes will be emitted to JS. If filterRegexes is empty or not
 * provided, all requests are considered.
 */
public class NativeInterceptWebViewManager extends RNCWebViewManager {
    public static final String REACT_CLASS = "RNNativeInterceptWebView";
    private String nativeUrlRegex = "";

    // Map viewId -> list of compiled Patterns
    private static final ConcurrentHashMap<Integer, List<Pattern>> viewFilterMap = new ConcurrentHashMap<>();

    public NativeInterceptWebViewManager(ReactApplicationContext reactContext) { super(); }

    @NonNull
    @Override
    public String getName() { return REACT_CLASS; }

    @Override
    public RNCWebViewWrapper createViewInstance(ThemedReactContext reactContext) {
        RNCWebViewWrapper wrapper = super.createViewInstance(reactContext);
        if (wrapper != null && wrapper.getWebView() != null) {
            wrapper.getWebView().setWebViewClient(new NativeInterceptingWebViewClient());
        }
        return wrapper;
    }

    @Override
    public void onAfterUpdateTransaction(RNCWebViewWrapper viewWrapper) {
        super.onAfterUpdateTransaction(viewWrapper);
        if (viewWrapper != null && viewWrapper.getWebView() != null) {
            viewWrapper.getWebView().setWebViewClient(new NativeInterceptingWebViewClient());
        }
    }

    protected class NativeInterceptingWebViewClient extends RNCWebViewClient {
        @Nullable
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            maybeEmit(view, url);
            return super.shouldInterceptRequest(view, url);
        }

        @TargetApi(Build.VERSION_CODES.LOLLIPOP)
        @Nullable
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String url = request.getUrl() != null ? request.getUrl().toString() : null;
            maybeEmit(view, url);
            return super.shouldInterceptRequest(view, request);
        }

        private void maybeEmit(WebView view, String url){
            if (url == null) return;

            // Check per-view filters (if any). If none present, treat as matched.
            boolean matched = false;
            try {
                List<Pattern> patterns = viewFilterMap.get(view.getId());
                if (patterns == null || patterns.isEmpty()) {
                    matched = true;
                } else {
                    for (Pattern p : patterns) {
                        try {
                            if (p.matcher(url).find()) { matched = true; break; }
                        } catch (Throwable ignore) {}
                    }
                }
            } catch (Throwable t) {
                // If any error with matching, default to not matched to avoid noise
                try { android.util.Log.i("RNNativeIntercept", "filter check failed: " + t.getMessage()); } catch (Throwable ignored) {}
                matched = false;
            }

            if (!matched) return;

            // Log intercepted url for debugging
            try { android.util.Log.i("RNNativeIntercept", "maybeEmit called for url: " + url); } catch (Throwable ignored) {}

            boolean emitted = false;
            try {
                // per-view direct event
                ReactContext reactContext = (ReactContext) view.getContext();
                WritableMap map = Arguments.createMap();
                map.putString("url", url);
                reactContext.getJSModule(RCTEventEmitter.class)
                    .receiveEvent(view.getId(), "onIntercept", map);
                emitted = true;
                try { android.util.Log.i("RNNativeIntercept", "direct emit succeeded for viewId=" + view.getId()); } catch (Throwable ignored) {}
            } catch (Throwable t) {
                try { android.util.Log.i("RNNativeIntercept", "direct emit failed: " + t.getMessage()); } catch (Throwable ignored) {}
            }
            if (!emitted) {
                // fallback: device-wide emitter
                try {
                    ReactContext reactContext = (ReactContext) view.getContext();
                    reactContext.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("RNInterceptNative", url);
                    try { android.util.Log.i("RNNativeIntercept", "device emitter used for url: " + url); } catch (Throwable ignored) {}
                } catch (Throwable t) {
                    try { android.util.Log.i("RNNativeIntercept", "device emitter failed: " + t.getMessage()); } catch (Throwable ignored) {}
                }
            }
        }
    }

    @com.facebook.react.uimanager.annotations.ReactProp(name = "nativeUrlRegex")
    public void setNativeUrlRegex(RNCWebViewWrapper viewWrapper, @Nullable String regex){
        this.nativeUrlRegex = regex;
        if (viewWrapper != null && viewWrapper.getWebView() != null) {
            viewWrapper.getWebView().setWebViewClient(new NativeInterceptingWebViewClient());
        }
    }

    /**
     * Accepts a ReadableArray of regex strings from JS and stores compiled Patterns keyed by view id.
     * Pass an empty array or null to clear filters for this view.
     */
    @com.facebook.react.uimanager.annotations.ReactProp(name = "filterRegexes")
    public void setFilterRegexes(RNCWebViewWrapper viewWrapper, @Nullable ReadableArray regexArray) {
        if (viewWrapper == null || viewWrapper.getWebView() == null) return;
        int viewId = viewWrapper.getWebView().getId();
        try {
            if (regexArray == null || regexArray.size() == 0) {
                viewFilterMap.remove(viewId);
                return;
            }
            List<Pattern> patterns = new ArrayList<>();
            for (int i = 0; i < regexArray.size(); i++) {
                try {
                    String s = regexArray.getString(i);
                    if (s != null && !s.isEmpty()) {
                        patterns.add(Pattern.compile(s, Pattern.CASE_INSENSITIVE));
                    }
                } catch (Throwable ignored) {}
            }
            viewFilterMap.put(viewId, patterns);
        } catch (Throwable t) {
            try { android.util.Log.i("RNNativeIntercept", "setFilterRegexes failed: " + t.getMessage()); } catch (Throwable ignored) {}
        }
    }

    @Nullable
    @Override
    public java.util.Map getExportedCustomDirectEventTypeConstants() {
        // Merge our custom direct event with the base class events to avoid removing
        try {
            java.util.Map superMap = super.getExportedCustomDirectEventTypeConstants();
            java.util.Map myMap = MapBuilder.<String, Object>of(
                "onIntercept", MapBuilder.of("registrationName", "onIntercept")
            );
            if (superMap == null) return myMap;
            java.util.HashMap merged = new java.util.HashMap(superMap);
            merged.putAll(myMap);
            return merged;
        } catch (Throwable t) {
            // Fall back to only our event if merging fails
            return MapBuilder.<String, Object>of(
                "onIntercept", MapBuilder.of("registrationName", "onIntercept")
            );
        }
    }
}