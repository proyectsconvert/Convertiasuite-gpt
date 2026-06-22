import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";

describe("apiFetch auth recovery", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("refreshToken", "refresh-token");
        vi.restoreAllMocks();
    });

    it("does not keep retrying refresh after the first expired-session failure", async () => {
        const assignSpy = vi.fn();
        Object.defineProperty(window, "location", {
            configurable: true,
            value: { ...window.location, assign: assignSpy },
        });

        const fetchMock = vi.fn();
        fetchMock.mockImplementation((input: RequestInfo | URL) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

            if (url.includes("/auth/refresh")) {
                return Promise.resolve(
                    new Response(JSON.stringify({ detail: "expired" }), {
                        status: 401,
                        headers: { "Content-Type": "application/json" },
                    })
                );
            }

            return Promise.resolve(
                new Response("", {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                })
            );
        });

        globalThis.fetch = fetchMock as unknown as typeof fetch;

        await expect(apiFetch("/chat/test")).rejects.toThrow();
        await expect(apiFetch("/chat/test-2")).rejects.toThrow();

        const refreshCalls = fetchMock.mock.calls.filter(([input]) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
            return url.includes("/auth/refresh");
        });

        expect(refreshCalls).toHaveLength(1);
        expect(assignSpy).toHaveBeenCalledTimes(1);
    });

    it("forwards the abort signal when a stream request is cancelled", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        );

        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const controller = new AbortController();

        await apiFetch("/chat/test", { signal: controller.signal });

        expect(fetchMock).toHaveBeenCalledWith(
            "/chat/test",
            expect.objectContaining({ signal: controller.signal })
        );
    });
});
