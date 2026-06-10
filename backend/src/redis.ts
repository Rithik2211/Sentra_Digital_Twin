import Redis from 'ioredis';
import { EventEmitter } from 'events';

export let isRedisConnected = false;
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

// Fallback in-memory structures
const memoryPubSub = new EventEmitter();
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function connectRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    redisPublisher = new Redis(redisUrl, { 
      maxRetriesPerRequest: 1,
      connectTimeout: 2000
    });
    redisSubscriber = new Redis(redisUrl, { 
      maxRetriesPerRequest: 1,
      connectTimeout: 2000
    });

    // Test ping
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Redis ping timeout')), 1500);
      redisPublisher!.ping((err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    });

    isRedisConnected = true;
    console.log('⚡️ Successfully connected to Redis server');
  } catch (error) {
    console.warn('⚠️ Redis unreachable. Falling back to in-memory event emitters for simulation ticks & briefings.');
    isRedisConnected = false;
    redisPublisher = null;
    redisSubscriber = null;
  }
}

export async function publishMessage(channel: string, message: string) {
  if (isRedisConnected && redisPublisher) {
    try {
      await redisPublisher.publish(channel, message);
    } catch (err) {
      console.error('Error publishing to Redis, falling back to emitter:', err);
      memoryPubSub.emit(channel, message);
    }
  } else {
    memoryPubSub.emit(channel, message);
  }
}

export async function subscribeChannel(channel: string, callback: (message: string) => void) {
  if (isRedisConnected && redisSubscriber) {
    try {
      await redisSubscriber.subscribe(channel);
      
      const onMessage = (chan: string, msg: string) => {
        if (chan === channel) {
          callback(msg);
        }
      };
      
      redisSubscriber.on('message', onMessage);
      
      return () => {
        redisSubscriber?.off('message', onMessage);
        redisSubscriber?.unsubscribe(channel).catch(() => {});
      };
    } catch (err) {
      console.error('Error subscribing to Redis, falling back to emitter:', err);
      memoryPubSub.on(channel, callback);
      return () => {
        memoryPubSub.off(channel, callback);
      };
    }
  } else {
    memoryPubSub.on(channel, callback);
    return () => {
      memoryPubSub.off(channel, callback);
    };
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisConnected && redisPublisher) {
    try {
      return await redisPublisher.get(key);
    } catch (err) {
      console.error('Error reading cache from Redis:', err);
    }
  }
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number) {
  if (isRedisConnected && redisPublisher) {
    try {
      await redisPublisher.setex(key, ttlSeconds, value);
      return;
    } catch (err) {
      console.error('Error writing cache to Redis:', err);
    }
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
