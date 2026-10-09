import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { storagePut } from "../server/storage";
import { ENV } from "../server/_core/env";

// We need to mock ENV because it's populated on module load
vi.mock("../server/_core/env", () => ({
  ENV: {
    forgeApiUrl: "https://forge.api",
    forgeApiKey: "fake-key",
  },
}));

describe("storagePut", () => {
  let fetchMock: any;

  beforeEach(() => {
    // Save original ENV values
    ENV.forgeApiUrl = "https://forge.api";
    ENV.forgeApiKey = "fake-key";

    // Setup fetch mock
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Default happy path mock setup
    fetchMock.mockImplementation((url: URL | string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/v1/storage/presign/put")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: "https://s3.amazonaws.com/bucket/upload-url" }),
        });
      }
      if (urlStr.includes("s3.amazonaws.com")) {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error(`Unhandled fetch url: ${urlStr}`));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("successfully uploads a string to S3 via presigned URL", async () => {
    const data = "hello world";
    const result = await storagePut("test-file.txt", data);

    // Should return a correctly formatted key and URL
    expect(result.key).toMatch(/^test-file_[a-f0-9]{8}\.txt$/);
    expect(result.url).toBe(`/manus-storage/${result.key}`);

    // Fetch should be called twice
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 1st call: presign URL
    const presignCallArgs = fetchMock.mock.calls[0];
    expect(presignCallArgs[0].toString()).toMatch(/^https:\/\/forge\.api\/v1\/storage\/presign\/put\?path=test-file_[a-f0-9]{8}\.txt$/);
    expect(presignCallArgs[1].headers).toEqual({ Authorization: "Bearer fake-key" });

    // 2nd call: S3 PUT
    const uploadCallArgs = fetchMock.mock.calls[1];
    expect(uploadCallArgs[0].toString()).toBe("https://s3.amazonaws.com/bucket/upload-url");
    expect(uploadCallArgs[1].method).toBe("PUT");
    expect(uploadCallArgs[1].headers).toEqual({ "Content-Type": "application/octet-stream" });
    expect(uploadCallArgs[1].body).toBeInstanceOf(Blob);
  });

  it("throws error if forge URL is missing", async () => {
    ENV.forgeApiUrl = "";
    await expect(storagePut("test.txt", "data")).rejects.toThrow(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  });

  it("throws error if forge key is missing", async () => {
    ENV.forgeApiKey = "";
    await expect(storagePut("test.txt", "data")).rejects.toThrow(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  });

  it("throws error if presign request fails", async () => {
    fetchMock.mockImplementationOnce((url: URL | string) => {
      return Promise.resolve({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });
    });

    await expect(storagePut("test.txt", "data")).rejects.toThrow(
      "Storage presign failed (403): Forbidden"
    );
  });

  it("throws error if presign request returns empty URL", async () => {
    fetchMock.mockImplementationOnce((url: URL | string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: "" }),
      });
    });

    await expect(storagePut("test.txt", "data")).rejects.toThrow(
      "Forge returned empty presign URL"
    );
  });

  it("throws error if S3 upload fails", async () => {
    fetchMock.mockImplementation((url: URL | string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/v1/storage/presign/put")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: "https://s3.amazonaws.com/bucket/upload-url" }),
        });
      }
      if (urlStr.includes("s3.amazonaws.com")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
    });

    await expect(storagePut("test.txt", "data")).rejects.toThrow(
      "Storage upload to S3 failed (500)"
    );
  });

  it("normalizes the relative key and appends hash before extension", async () => {
    const result = await storagePut("/my-folder/my-file.jpg", "data");
    expect(result.key).toMatch(/^my-folder\/my-file_[a-f0-9]{8}\.jpg$/);
  });

  it("handles relative key without extension", async () => {
    const result = await storagePut("my-file-no-ext", "data");
    expect(result.key).toMatch(/^my-file-no-ext_[a-f0-9]{8}$/);
  });
});
