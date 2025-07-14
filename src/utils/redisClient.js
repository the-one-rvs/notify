import Redis from "ioredis";

//Remember to set redis eviction policy for fullfillmemt of memory
// steps -->
// .) redis-cli
// .) CONFIG SET maxmemory 100mb #(100mb is the maximum memory)
// .) CONFIG SET maxmemory-policy allkeys-lru #(this is eviction policy from which the key which is not used evicted)
const redis = new Redis({
  host: process.env.REDIS_IP, // or your Redis server address
  port: process.env.REDIS_PORT,
});

redis.on("connect", () => console.log("🔗 Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

export default redis;
