"use client";

import { useEffect, useId, useRef } from "react";

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Cloudflare Turnstile widget. If NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set
 * (e.g. local dev before keys are issued), this renders a visible
 * placeholder instead so the form can still be tested end-to-end; the
 * server treats a missing TURNSTILE_SECRET_KEY the same way (see
 * lib/turnstile.ts). Swap the whole component out once Turnstile is ready.
 */
export function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const containerId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    function renderWidget() {
      if (!window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(`#${containerId}`, {
        sitekey: siteKey as string,
        callback: onVerify,
        "expired-callback": onExpire,
      });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, containerId]);

  if (!siteKey) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
        [Turnstile placeholder] ยังไม่ได้ตั้งค่า NEXT_PUBLIC_TURNSTILE_SITE_KEY —
        ระบบจะข้ามการตรวจสอบ anti-bot ชั่วคราว
        <button
          type="button"
          onClick={() => onVerify("dev-placeholder-token")}
          className="ml-2 text-wuh-blue underline"
        >
          จำลองการยืนยันสำเร็จ
        </button>
      </div>
    );
  }

  return <div id={containerId} />;
}
