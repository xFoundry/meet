import type { ConfigService } from "@nestjs/config";
import type { DeploymentsRepository } from "./deployments.repository";
import { DeploymentsService } from "./deployments.service";
import type { RedisService } from "@/modules/redis/redis.service";

const licenseKey = "test-license-key";
const licenseKeyUrl = "https://license.example/api/license";

type LicenseApiResponse = {
  status?: boolean;
  valid?: boolean;
};

type RedisMock = {
  get: jest.Mock<Promise<string | null>, [string]>;
  set: jest.Mock<Promise<"OK">, [string, string, "EX", number]>;
};

type CreateServiceResult = {
  fetch: jest.SpiedFunction<typeof global.fetch>;
  redis: RedisMock;
  service: DeploymentsService;
};

const createService = ({
  cachedData = null,
  fetchedData,
}: {
  cachedData?: string | null;
  fetchedData?: LicenseApiResponse;
}): CreateServiceResult => {
  const configService = {
    get: jest.fn((key: string) => {
      const config = {
        "api.licenseKey": licenseKey,
        "api.licenseKeyUrl": licenseKeyUrl,
        e2e: false,
      };

      return config[key as keyof typeof config];
    }),
  } as unknown as ConfigService;
  const redis: RedisMock = {
    get: jest.fn<Promise<string | null>, [string]>().mockResolvedValue(cachedData),
    set: jest.fn<Promise<"OK">, [string, string, "EX", number]>().mockResolvedValue("OK"),
  };
  const redisService = Object.create(null) as RedisService;
  redisService.redis = redis as unknown as RedisService["redis"];
  const deploymentsRepository = Object.create(null) as DeploymentsRepository;

  const service = new DeploymentsService(deploymentsRepository, configService, redisService);
  const fetch = jest
    .spyOn(global, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(fetchedData ?? { status: false })));

  return {
    fetch,
    redis,
    service,
  };
};

describe("DeploymentsService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("checkLicense", () => {
    it("accepts the status license response shape", async () => {
      const { redis, service } = createService({ fetchedData: { status: true } });

      await expect(service.checkLicense()).resolves.toBe(true);
      expect(redis.get).toHaveBeenCalledWith(expect.stringContaining(licenseKey));
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(licenseKey),
        JSON.stringify({ status: true }),
        "EX",
        expect.any(Number)
      );
    });

    it("accepts the valid license response shape", async () => {
      const { service } = createService({ fetchedData: { valid: true } });

      await expect(service.checkLicense()).resolves.toBe(true);
    });

    it("accepts cached valid license responses", async () => {
      const { fetch, redis, service } = createService({ cachedData: JSON.stringify({ valid: true }) });

      await expect(service.checkLicense()).resolves.toBe(true);
      expect(redis.set).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects invalid license responses", async () => {
      const { service } = createService({ fetchedData: { valid: false } });

      await expect(service.checkLicense()).resolves.toBe(false);
    });
  });
});
