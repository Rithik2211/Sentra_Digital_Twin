"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedisConnected = void 0;
exports.connectRedis = connectRedis;
exports.publishMessage = publishMessage;
exports.subscribeChannel = subscribeChannel;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
exports.isRedisConnected = false;
let redisPublisher = null;
let redisSubscriber = null;
// Fallback in-memory structures
const memoryPubSub = new events_1.EventEmitter();
const memoryCache = new Map();
async function connectRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
        redisPublisher = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 2000
        });
        redisSubscriber = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 2000
        });
        // Test ping
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Redis ping timeout')), 1500);
            redisPublisher.ping((err) => {
                clearTimeout(timeout);
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        exports.isRedisConnected = true;
        console.log('⚡️ Successfully connected to Redis server');
    }
    catch (error) {
        console.warn('⚠️ Redis unreachable. Falling back to in-memory event emitters for simulation ticks & briefings.');
        exports.isRedisConnected = false;
        redisPublisher = null;
        redisSubscriber = null;
    }
}
async function publishMessage(channel, message) {
    if (exports.isRedisConnected && redisPublisher) {
        try {
            await redisPublisher.publish(channel, message);
        }
        catch (err) {
            console.error('Error publishing to Redis, falling back to emitter:', err);
            memoryPubSub.emit(channel, message);
        }
    }
    else {
        memoryPubSub.emit(channel, message);
    }
}
async function subscribeChannel(channel, callback) {
    if (exports.isRedisConnected && redisSubscriber) {
        try {
            await redisSubscriber.subscribe(channel);
            const onMessage = (chan, msg) => {
                if (chan === channel) {
                    callback(msg);
                }
            };
            redisSubscriber.on('message', onMessage);
            return () => {
                redisSubscriber?.off('message', onMessage);
                redisSubscriber?.unsubscribe(channel).catch(() => { });
            };
        }
        catch (err) {
            console.error('Error subscribing to Redis, falling back to emitter:', err);
            memoryPubSub.on(channel, callback);
            return () => {
                memoryPubSub.off(channel, callback);
            };
        }
    }
    else {
        memoryPubSub.on(channel, callback);
        return () => {
            memoryPubSub.off(channel, callback);
        };
    }
}
async function cacheGet(key) {
    if (exports.isRedisConnected && redisPublisher) {
        try {
            return await redisPublisher.get(key);
        }
        catch (err) {
            console.error('Error reading cache from Redis:', err);
        }
    }
    const item = memoryCache.get(key);
    if (!item)
        return null;
    if (Date.now() > item.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return item.value;
}
async function cacheSet(key, value, ttlSeconds) {
    if (exports.isRedisConnected && redisPublisher) {
        try {
            await redisPublisher.setex(key, ttlSeconds, value);
            return;
        }
        catch (err) {
            console.error('Error writing cache to Redis:', err);
        }
    }
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}
