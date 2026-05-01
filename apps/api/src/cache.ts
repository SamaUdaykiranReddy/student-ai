import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => console.error("Redis error:", err));
client.on("connect", () => console.log("✅ Redis connected"));

const connectRedis = async () => {
  await client.connect();
};

connectRedis();

export default client;