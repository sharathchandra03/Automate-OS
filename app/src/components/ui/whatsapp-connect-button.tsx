"use client";

import * as React from "react";
import { CheckCircle, AlertCircle, Loader2, MessageCircle } from "lucide-react";
import { META_APP_ID, META_CONFIG_ID, SERVER_URL } from "@/lib/config";

// ── Facebook SDK global type ──────────────────────────────────────────────────

declare global {
  interface Window {
    FB: {
      init: (opts: object) => void;
      login: (
        cb: (response: FBLoginResponse) => void,
        opts: object
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface FBLoginResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    grantedScopes?: string;
  };
}

// ── Meta session info (sent via window.postMessage during embedded signup) ────

interface MetaSessionInfo {
  type: "WA_EMBEDDED_SIGNUP";
  event: "FINISH" | "CANCEL" | "ERROR";
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    display_phone_number?: string;
    current_step?: string;
  };
  version?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WhatsAppConnectButtonProps {
  organizationId: string;
  onSuccess?: (phoneNumber: string) => void;
  onError?: (message: string) => void;
  /** Pre-existing connected number — shows status instead of button */
  connectedPhone?: string | null;
}

type Status = "idle" | "loading_sdk" | "opening" | "exchanging" | "success" | "error";

export function WhatsAppConnectButton({
  organizationId,
  onSuccess,
  onError,
  connectedPhone,
}: WhatsAppConnectButtonProps) {
  const [status, setStatus] = React.useState<Status>(connectedPhone ? "success" : "idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState<string | null>(connectedPhone ?? null);

  // Capture WABA/phone info from Meta's postMessage during embedded signup
  const sessionRef = React.useRef<{
    waba_id?: string;
    phone_number_id?: string;
    display_phone_number?: string;
  }>({});

  // Load FB SDK once on mount
  React.useEffect(() => {
    if (document.getElementById("facebook-sdk")) return;

    setStatus("loading_sdk");

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v19.0",
      });
      setStatus("idle");
    };

    const script = document.createElement("script");
    script.id = "facebook-sdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      window.fbAsyncInit = undefined;
    };
  }, []);

  // Listen for Meta's session info postMessage
  React.useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com") return;

      let data: MetaSessionInfo | null = null;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

      if (data.event === "FINISH" && data.data) {
        sessionRef.current = {
          waba_id: data.data.waba_id,
          phone_number_id: data.data.phone_number_id,
          display_phone_number: data.data.display_phone_number,
        };
      }

      if (data.event === "CANCEL") {
        setStatus("idle");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleConnect() {
    if (!META_APP_ID) {
      setStatus("error");
      setErrorMsg("META_APP_ID not configured. Add NEXT_PUBLIC_META_APP_ID to your .env.");
      return;
    }

    setStatus("opening");
    sessionRef.current = {};

    window.FB.login(
      async (response) => {
        if (response.status !== "connected" || !response.authResponse?.code) {
          setStatus("idle");
          return;
        }

        const code = response.authResponse.code;
        const { waba_id, phone_number_id, display_phone_number } = sessionRef.current;

        // Wait a tick for the postMessage to arrive if it hasn't yet
        await new Promise((r) => setTimeout(r, 400));

        const wabaId = waba_id ?? sessionRef.current.waba_id;
        const phoneNumberId = phone_number_id ?? sessionRef.current.phone_number_id;
        const displayPhone = display_phone_number ?? sessionRef.current.display_phone_number ?? "";

        if (!wabaId || !phoneNumberId) {
          setStatus("error");
          setErrorMsg("Could not retrieve WhatsApp account details. Please try again.");
          onError?.("Missing WABA/phone_number_id from Meta session");
          return;
        }

        setStatus("exchanging");

        try {
          const res = await fetch(`${SERVER_URL}/api/workspace/whatsapp/embedded-signup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-organization-id": organizationId,
            },
            body: JSON.stringify({
              code,
              waba_id: wabaId,
              phone_number_id: phoneNumberId,
              display_phone_number: displayPhone,
            }),
          });

          const body = (await res.json()) as { success?: boolean; error?: string; warning?: string; channel?: { phone_number: string } };

          if (!res.ok || !body.success) {
            throw new Error(body.error ?? "Connection failed");
          }

          const connectedNumber = body.channel?.phone_number ?? displayPhone;
          setPhone(connectedNumber);
          setStatus("success");
          onSuccess?.(connectedNumber);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Connection failed";
          setStatus("error");
          setErrorMsg(msg);
          onError?.(msg);
        }
      },
      {
        // If you created a Configuration in Meta App > Embedded Signup, put its ID here.
        // Otherwise Meta uses the default app scopes.
        ...(META_CONFIG_ID ? { config_id: META_CONFIG_ID } : {}),
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        extras: { sessionInfoVersion: 2 },
      }
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (status === "success" && phone) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">WhatsApp Connected</p>
            <p className="text-xs text-muted-foreground">{phone}</p>
          </div>
        </div>
        <button
          onClick={() => { setStatus("idle"); setPhone(null); }}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{errorMsg ?? "Connection failed"}</p>
        </div>
        <button
          onClick={() => { setStatus("idle"); setErrorMsg(null); }}
          className="text-xs text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const isLoading = status === "loading_sdk" || status === "opening" || status === "exchanging";

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#20bd5a] disabled:opacity-60 transition-colors"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {status === "loading_sdk" && "Loading..."}
          {status === "opening" && "Opening Meta..."}
          {status === "exchanging" && "Connecting..."}
        </>
      ) : (
        <>
          <MessageCircle className="h-4 w-4" />
          Connect WhatsApp
        </>
      )}
    </button>
  );
}
