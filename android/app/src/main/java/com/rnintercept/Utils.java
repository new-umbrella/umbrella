package com.rnintercept;

public class Utils {
	public static boolean matchesRegex(String url, String regex) {
		try {
			return url != null && url.matches(regex);
		} catch (Throwable t) {
			return false;
		}
	}

	public static String sanitizeForJs(String s){
		if (s == null) return "";
		return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ");
	}
}


