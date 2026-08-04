import { buildRedisConnectionOptions } from "./redis";

describe("buildRedisConnectionOptions", () => {
  it("enables dual-stack lookup without TLS for Railway private Redis", () => {
    const result = buildRedisConnectionOptions("redis://default:secret@redis.railway.internal:6379/0");

    expect(result).toEqual({
      host: "redis.railway.internal",
      port: 6379,
      db: 0,
      family: 0,
      username: "default",
      password: "secret",
    });
    expect(result.tls).toBeUndefined();
  });

  it("enables TLS explicitly for rediss connections", () => {
    const result = buildRedisConnectionOptions("rediss://cache.example.com:6380/2");

    expect(result).toEqual({
      host: "cache.example.com",
      port: 6380,
      db: 2,
      family: 0,
      tls: {},
    });
  });

  it("decodes credentials and applies default port and database", () => {
    const result = buildRedisConnectionOptions("redis://user%40example:p%3Ass@cache.example.com");

    expect(result).toEqual({
      host: "cache.example.com",
      port: 6379,
      db: 0,
      family: 0,
      username: "user@example",
      password: "p:ss",
    });
  });

  it("normalizes literal IPv6 hosts for ioredis", () => {
    const result = buildRedisConnectionOptions("redis://[::1]:6379/0");

    expect(result).toMatchObject({
      host: "::1",
      port: 6379,
      db: 0,
      family: 0,
    });
  });

  it("preserves supported URL options while enforcing connection invariants", () => {
    const result = buildRedisConnectionOptions(
      "redis://cache.example.com/0?connectTimeout=25000&keepAlive=1000&keyPrefix=cal&family=4&tls=true"
    );

    expect(result).toMatchObject({
      connectTimeout: 25000,
      keepAlive: 1000,
      keyPrefix: "cal",
      family: 0,
    });
    expect(result.tls).toBeUndefined();
  });

  it.each([
    "not-a-url",
    "https://cache.example.com",
    "redis:///0",
    "redis://cache.example.com/not-a-database",
    "redis://cache.example.com/1/2",
    "redis://default:%E0%A4%A@cache.example.com",
  ])("rejects invalid Redis URL %s without echoing its value", (value) => {
    expect(() => buildRedisConnectionOptions(value)).toThrow(/^REDIS_URL/);
  });
});
