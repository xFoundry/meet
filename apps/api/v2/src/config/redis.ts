import type { RedisOptions } from "ioredis";

const REDIS_PROTOCOLS: ReadonlySet<string> = new Set(["redis:", "rediss:"]);
const DEFAULT_REDIS_PORT = 6379;

function parseDatabase(pathname: string): number {
  const value = pathname.replace(/^\//, "");
  if (value === "") return 0;

  if (!/^\d+$/.test(value)) {
    throw new Error("REDIS_URL database must be a non-negative integer.");
  }

  const database = Number(value);
  if (!Number.isSafeInteger(database)) {
    throw new Error("REDIS_URL database must be a safe integer.");
  }

  return database;
}

function decodeCredential(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error("REDIS_URL credentials must use valid percent-encoding.");
  }
}

/**
 * Build the shared connection options used by every API v2 ioredis consumer.
 *
 * Railway legacy private networks expose `*.railway.internal` over IPv6 only,
 * while ioredis defaults to IPv4. `family: 0` enables a dual-stack lookup. TLS
 * is derived from the URL scheme (`rediss:`), so private `redis:` endpoints
 * remain plaintext and Bull cannot lose TLS by stripping the original scheme.
 */
export function buildRedisConnectionOptions(rawUrl: string): RedisOptions {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("REDIS_URL must be a valid Redis URL.");
  }

  if (!REDIS_PROTOCOLS.has(url.protocol) || !url.hostname) {
    throw new Error("REDIS_URL must use redis:// or rediss:// with a hostname.");
  }

  let port = DEFAULT_REDIS_PORT;
  if (url.port !== "") {
    port = Number(url.port);
  }

  const options: RedisOptions = {
    host: url.hostname,
    port,
    db: parseDatabase(url.pathname),
    family: 0,
  };

  if (url.username !== "") {
    options.username = decodeCredential(url.username);
  }
  if (url.password !== "") {
    options.password = decodeCredential(url.password);
  }
  if (url.protocol === "rediss:") {
    options.tls = {};
  }

  return options;
}
