import { describe, expect, it, vi } from "vitest";
import clientInvitesApi from "./clientInvites.api";

vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

const TOKEN = "kJ8vQ2mNpR4xW7yLbT0cV6jHfD3qS8aZgE1uI5oK9nM";

describe("clientInvitesApi", () => {
  it("posts the token in the BODY of /public/client-invites/inspect", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "ok", data: null },
    });

    await clientInvitesApi.inspect({ token: TOKEN });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/public/client-invites/inspect",
      { token: TOKEN },
    );
  });

  it("posts the acceptance payload to /public/client-invites/accept", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "ok", data: { email: "a@b.pt" } },
    });

    await clientInvitesApi.accept({
      token: TOKEN,
      password: "senhaForte123",
      confirmPassword: "senhaForte123",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/public/client-invites/accept",
      {
        token: TOKEN,
        password: "senhaForte123",
        confirmPassword: "senhaForte123",
      },
    );
  });

  it("never places the token in the URL", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: "ok", data: null },
    });

    await clientInvitesApi.inspect({ token: TOKEN });

    const [url] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).not.toContain(TOKEN);
    expect(url).not.toContain(":token");
  });
});
