import { describe, it, expect, beforeEach, vi } from "vitest";
import { hablar } from "./voice";
import { voiceConversation } from "./voiceConversation";

vi.mock("./voice", () => ({
  hablar: vi.fn(),
}));

describe("voiceConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    voiceConversation.stop();
  });

  it("does not speak unless the voice conversation is active", async () => {
    await voiceConversation.speak("hola");

    expect(hablar).not.toHaveBeenCalled();
  });

  it("speaks only when the voice conversation is active", async () => {
    voiceConversation.start();

    await voiceConversation.speak("hola");

    expect(hablar).toHaveBeenCalledWith(
      "hola",
      expect.any(Function),
      expect.any(Function),
    );
  });
});
