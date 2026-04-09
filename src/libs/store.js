const redis = require("./redis");

const TTL = 7 * 24 * 60 * 60; // 7 days in seconds

module.exports = {
  async get(key) {
    return redis ? redis.get(key) : null;
  },
  async set(key, value) {
    if (redis) await redis.setex(key, TTL, value);
  },
};
