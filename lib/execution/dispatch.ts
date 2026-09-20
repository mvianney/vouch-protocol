/**
 * lib/execution/dispatch.ts
 *
 * Dispatches a cryptographically signed hire request to the selected agent's
 * service endpoint.
 *
 * Guarantees:
 *   1. Sends the task along with the full cryptographic signed proof of authorization.
 *   2. Enforces a strict timeout (default: 8000ms) with AbortController.
 *   3. Resolves localhost URLs safely if operating within server-side environments.
 *   4. Catches connection refusals, 4xx/5xx HTTP statuses, and timeouts gracefully,
 *      returning a structured DispatchResult rather than throwing or crashing.
 */

import { SignedHireRequest } from "@/lib/hiring/sign";

export interface DispatchOptions {
  /** Request timeout in milliseconds (default: 8000ms) */
  timeoutMs?: number;
  /** Custom extra parameters to include in the task request body */
  extraParams?: Record<string, unknown>;
}

export interface DispatchSuccessResult {
  success: true;
  endpoint: string;
  statusCode: number;
  data: any;
  durationMs: number;
  dispatchedAt: string;
}

export interface DispatchFailureResult {
  success: false;
  endpoint: string;
  statusCode?: number;
  error: string;
  errorType: "TIMEOUT" | "NETWORK_ERROR" | "HTTP_ERROR" | "INVALID_ENDPOINT";
  durationMs: number;
  dispatchedAt: string;
}

export type DispatchResult = DispatchSuccessResult | DispatchFailureResult;

/**
 * Normalize an endpoint URL for server-side environments (e.g., handling relative URLs
 * or default localhost ports).
 */
function resolveEndpointUrl(rawEndpoint: string): string {
  if (!rawEndpoint || typeof rawEndpoint !== "string") {
    throw new Error("Agent does not have a valid service_endpoint configured");
  }

  const trimmed = rawEndpoint.trim();

  // If already absolute HTTP/HTTPS
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // If path-based relative URL, prepend host
  const port = process.env.PORT || 3000;
  const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
  return `${host.replace(/\/$/, "")}/${trimmed.replace(/^\//, "")}`;
}

/**
 * Dispatch a signed hire request to an agent's service endpoint
 *
 * @param serviceEndpoint - The target agent's HTTP service endpoint
 * @param signedRequest - The cryptographic signed request produced by signHireRequest()
 * @param options - Timeout and custom options
 */
export async function dispatchTaskToAgent(
  serviceEndpoint: string,
  signedRequest: SignedHireRequest,
  options: DispatchOptions = {}
): Promise<DispatchResult> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 8000;
  const dispatchedAt = new Date().toISOString();

  let targetUrl: string;
  try {
    targetUrl = resolveEndpointUrl(serviceEndpoint);
  } catch (err: any) {
    return {
      success: false,
      endpoint: serviceEndpoint,
      error: err.message,
      errorType: "INVALID_ENDPOINT",
      durationMs: Date.now() - start,
      dispatchedAt,
    };
  }

  // Construct standard agent execution request body
  const payloadBody = {
    action: "execute_task",
    task: signedRequest.parsedPayload.data.taskDescription,
    taskDescription: signedRequest.parsedPayload.data.taskDescription,
    agentAssetId: signedRequest.parsedPayload.asset,
    requester: signedRequest.signerPublicKey,
    // Cryptographic authorization proof
    authorization: {
      signedPayload: signedRequest.rawSignedPayload,
      signature: signedRequest.parsedPayload.sig,
      nonce: signedRequest.parsedPayload.nonce,
      issuedAt: signedRequest.parsedPayload.issuedAt,
      expiresAt: signedRequest.parsedPayload.data.expiresAt,
      signer: signedRequest.signerPublicKey,
    },
    ...(options.extraParams || {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Vouch-Signature": signedRequest.parsedPayload.sig,
        "X-Vouch-Signer": signedRequest.signerPublicKey,
      },
      body: JSON.stringify(payloadBody),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const durationMs = Date.now() - start;

    if (!res.ok) {
      let errDetail: string;
      try {
        const errorJson = await res.json();
        errDetail = errorJson.error || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errDetail = await res.text().catch(() => res.statusText);
      }

      return {
        success: false,
        endpoint: targetUrl,
        statusCode: res.status,
        error: `Agent endpoint responded with status ${res.status}: ${errDetail.slice(0, 200)}`,
        errorType: "HTTP_ERROR",
        durationMs,
        dispatchedAt,
      };
    }

    const responseData = await res.json();

    return {
      success: true,
      endpoint: targetUrl,
      statusCode: res.status,
      data: responseData,
      durationMs,
      dispatchedAt,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const durationMs = Date.now() - start;

    if (err.name === "AbortError" || controller.signal.aborted) {
      return {
        success: false,
        endpoint: targetUrl,
        error: `Agent endpoint timed out after ${timeoutMs}ms without response`,
        errorType: "TIMEOUT",
        durationMs,
        dispatchedAt,
      };
    }

    return {
      success: false,
      endpoint: targetUrl,
      error: `Network failure contacting agent endpoint: ${err.message}`,
      errorType: "NETWORK_ERROR",
      durationMs,
      dispatchedAt,
    };
  }
}
