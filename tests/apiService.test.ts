import test from "node:test";
import assert from "node:assert/strict";
import { fetchApiResult } from "../services/apiService";
import { useAppStore } from "../stores/useAppStore";

test("fetchApiResult handles 204 responses as successful empty payload", async () => {
  const previousFetch = globalThis.fetch;
  useAppStore.setState({ error: "stale-error" });
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;

  try {
    const result = await fetchApiResult("/api/mock-delete", { method: "DELETE" });
    assert.equal(result.ok, true);
    assert.equal(result.status, 204);
    assert.equal(result.data, null);
    assert.equal(result.error, null);
    assert.equal(useAppStore.getState().error, null);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("fetchApiResult supports successful non-JSON payloads", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("plain-text-ok", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })) as typeof fetch;

  try {
    const result = await fetchApiResult("/api/mock-plain");
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.equal(result.data, "plain-text-ok");
    assert.equal(result.error, null);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("fetchApiResult maps non-OK non-JSON responses to fallback HTTP error message", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("Bad request body", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    })) as typeof fetch;

  try {
    const result = await fetchApiResult("/api/mock-bad-request");
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.data, null);
    assert.equal(result.error, "HTTP error 400");
    assert.equal(useAppStore.getState().error, "API Error: HTTP error 400");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("fetchApiResult handles explicit success=false payloads", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false, error: "forced failure" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    const result = await fetchApiResult("/api/mock-success-false");
    assert.equal(result.ok, false);
    assert.equal(result.status, 200);
    assert.equal(result.data, null);
    assert.equal(result.error, "forced failure");
    assert.equal(useAppStore.getState().error, "API Error: forced failure");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("fetchApiResult handles network failures", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("offline");
  }) as typeof fetch;

  try {
    const result = await fetchApiResult("/api/mock-network");
    assert.equal(result.ok, false);
    assert.equal(result.status, 0);
    assert.equal(result.data, null);
    assert.equal(result.error, "Network Error: offline");
    assert.equal(useAppStore.getState().error, "Network Error: offline");
  } finally {
    globalThis.fetch = previousFetch;
  }
});
