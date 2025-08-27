package com.rnintercept;

import android.annotation.TargetApi;
import android.os.Build;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ThemedReactContext;
import com.reactnativecommunity.webview.RNCWebViewClient;
import com.reactnativecommunity.webview.RNCWebViewManager;
import com.reactnativecommunity.webview.RNCWebViewWrapper;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class InterceptWebViewManager extends RNCWebViewManager {
    public static final String REACT_CLASS = "RNInterceptWebViewAndroid";
    private String nativeUrlRegex = "";

    public InterceptWebViewManager(ReactApplicationContext reactContext) { super(); }

    @NonNull
    @Override
    public String getName() { return REACT_CLASS; }

    @Override
    public RNCWebViewWrapper createViewInstance(ThemedReactContext reactContext) {
        RNCWebViewWrapper wrapper = super.createViewInstance(reactContext);
        if (wrapper != null && wrapper.getWebView() != null) {
            try { setMessagingEnabled(wrapper, true); } catch (Throwable ignored) {}
            wrapper.getWebView().setWebViewClient(new InterceptingWebViewClient());
        }
        return wrapper;
    }

    @Override
    public void onAfterUpdateTransaction(RNCWebViewWrapper viewWrapper) {
        super.onAfterUpdateTransaction(viewWrapper);
        if (viewWrapper != null && viewWrapper.getWebView() != null) {
            try { setMessagingEnabled(viewWrapper, true); } catch (Throwable ignored) {}
            viewWrapper.getWebView().setWebViewClient(new InterceptingWebViewClient());
        }
    }

    @Override
    public void addEventEmitters(@NonNull ThemedReactContext reactContext, @NonNull RNCWebViewWrapper viewWrapper) {
        super.addEventEmitters(reactContext, viewWrapper);
        try { setMessagingEnabled(viewWrapper, true); } catch (Throwable ignored) {}
        if (viewWrapper != null && viewWrapper.getWebView() != null) {
            viewWrapper.getWebView().setWebViewClient(new InterceptingWebViewClient());
        }
    }

    public void setMessagingEnabled(@Nullable RNCWebViewWrapper viewWrapper, boolean enabled) {
        try {
            if (viewWrapper != null && viewWrapper.getWebView() != null) {
                // RNCWebView exposes setMessagingEnabled(boolean)
                viewWrapper.getWebView().setMessagingEnabled(enabled);
            }
        } catch (Throwable ignored) {}
    }

    protected class InterceptingWebViewClient extends RNCWebViewClient {
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
            // Native fallback: emit every request to JS/native bridge for logging
            {
            	final String payload = Utils.sanitizeForJs("{" +
            	        "\\\"__rnIntercept\\\":true,\\\"payload\\\":{\\\"kind\\\":\\\"native\\\",\\\"url\\\":\\\"" + url + "\\\"}}");
            	final String js =
            	        "(function(){try{"
            	                + "var m=\\\"" + payload + "\\\";"
            	                + "if(window.ReactNativeWebView && window.ReactNativeWebView.postMessage){"
            	                + "  window.ReactNativeWebView.postMessage(m);"
            	                + "}else{"
            	                + "  window.__rnInterceptQueue = window.__rnInterceptQueue || [];"
            	                + "  window.__rnInterceptQueue.push(m);"
            	                + "}"
            	                + "}catch(e){}})();";
            	try {
            	    // prefer evaluateJavascript on UI thread
            	    view.post(() -> view.evaluateJavascript(js, null));
            	} catch (Throwable t) {
            	    try { view.loadUrl("javascript:" + js); } catch (Throwable ignored) {}
            	}
            	// Also log to Android logcat to aid debugging
            	try { android.util.Log.i("RNIntercept", "native request: " + url); } catch (Throwable ignored) {}

                // Also emit a device-level event so JS listeners using DeviceEventEmitter
                // can receive the URL even if the per-view bridge isn't available.
                try {
                    ReactContext reactContext = (ReactContext) view.getContext();
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("RNInterceptNative", url);
                    try { android.util.Log.i("RNIntercept", "device emitter used for url: " + url); } catch (Throwable ignored) {}
                } catch (Throwable t) {
                    try { android.util.Log.i("RNIntercept", "device emitter failed: " + t.getMessage()); } catch (Throwable ignored) {}
                }
            }
        }
    }

    @com.facebook.react.uimanager.annotations.ReactProp(name = "nativeUrlRegex")
    public void setNativeUrlRegex(RNCWebViewWrapper viewWrapper, @Nullable String regex){
        this.nativeUrlRegex = regex;
        if (viewWrapper != null && viewWrapper.getWebView() != null) {
            try { setMessagingEnabled(viewWrapper, true); } catch (Throwable ignored) {}
            viewWrapper.getWebView().setWebViewClient(new InterceptingWebViewClient());
        }
    }
}
