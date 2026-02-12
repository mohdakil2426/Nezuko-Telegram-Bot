"use client";

/**
 * Telegram Login Widget Component
 *
 * Integrates with Telegram's Login Widget for owner authentication.
 * @see https://core.telegram.org/widgets/login
 */

import { useEffect, useRef, useCallback, useId } from "react";
import { LOGIN_BOT_USERNAME } from "@/lib/api/config";

/**
 * Telegram user data returned from the widget
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Props for the TelegramLogin component
 */
interface TelegramLoginProps {
  /** Bot username (without @). Defaults to env variable. */
  botName?: string;
  /** Button size: large, medium, or small */
  buttonSize?: "large" | "medium" | "small";
  /** Corner radius for the button (0-20) */
  cornerRadius?: number;
  /** Whether to show user photo in the button after login */
  showUserPhoto?: boolean;
  /** Language code (default: en) */
  lang?: string;
  /** Callback fired when user authenticates */
  onAuth: (user: TelegramUser) => void;
  /** Callback fired on widget load error */
  onError?: (error: Error) => void;
}

/**
 * Telegram Login Widget Component
 *
 * Renders Telegram's official login button that handles authentication
 * via the Telegram app on desktop/mobile.
 */
export function TelegramLogin({
  botName = LOGIN_BOT_USERNAME,
  buttonSize = "large",
  cornerRadius = 8,
  showUserPhoto = true,
  lang = "en",
  onAuth,
  onError,
}: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Use React's useId for stable callback name
  const uniqueId = useId().replace(/:/g, "_");
  const callbackName = `TelegramLoginCallback_${uniqueId}`;

  const handleAuth = useCallback(
    (user: TelegramUser) => {
      onAuth(user);
    },
    [onAuth]
  );

  useEffect(() => {
    // Capture refs at effect start
    const container = containerRef.current;

    // Early exit if no container
    if (!container) return;

    // Capture callback name for cleanup
    const currentCallbackName = callbackName;

    // Register callback on window object
    (window as unknown as Record<string, unknown>)[currentCallbackName] = handleAuth;

    // Create and load the Telegram widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;

    // Widget configuration via data attributes
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", buttonSize);
    script.setAttribute("data-radius", String(cornerRadius));
    script.setAttribute("data-onauth", `${currentCallbackName}(user)`);
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-lang", lang);

    if (!showUserPhoto) {
      script.setAttribute("data-userpic", "false");
    }

    // Error handling
    script.onerror = () => {
      onError?.(new Error("Failed to load Telegram Login Widget"));
    };

    // Store script ref
    scriptRef.current = script;

    // Append script to container
    container.appendChild(script);

    // Cleanup on unmount
    return () => {
      // Remove callback from window
      delete (window as unknown as Record<string, unknown>)[currentCallbackName];

      // Remove script element
      const currentScript = scriptRef.current;
      if (currentScript && container.contains(currentScript)) {
        container.removeChild(currentScript);
      }
    };
  }, [botName, buttonSize, cornerRadius, showUserPhoto, lang, handleAuth, onError, callbackName]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center min-h-[44px]"
      data-testid="telegram-login-widget"
    />
  );
}

export default TelegramLogin;
