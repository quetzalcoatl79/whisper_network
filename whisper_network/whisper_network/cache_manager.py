"""
Cache Manager for Whisper Network
Handles Redis caching with in-memory fallback
"""
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from collections import OrderedDict

import redis

logger = logging.getLogger(__name__)


class InMemoryCache:
    """Fallback in-memory cache with LRU eviction"""
    
    def __init__(self, max_size: int = 1000):
        self.cache: OrderedDict[str, tuple[Any, datetime]] = OrderedDict()
        self.max_size = max_size
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key not in self.cache:
            return None
        
        value, expiry = self.cache[key]
        if datetime.now() > expiry:
            del self.cache[key]
            return None
        
        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return value
    
    def set(self, key: str, value: Any, ttl: int):
        """Set value with TTL (seconds)"""
        expiry = datetime.now() + timedelta(seconds=ttl)
        self.cache[key] = (value, expiry)
        
        # Evict oldest if exceeds max size
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)
    
    def delete(self, key: str):
        """Delete key from cache"""
        self.cache.pop(key, None)
    
    def exists(self, key: str) -> bool:
        """Check if key exists and not expired"""
        return self.get(key) is not None
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()


class CacheManager:
    """
    Unified cache manager with Redis primary and in-memory fallback
    Optimized for session mapping storage
    """
    
    def __init__(
        self,
        redis_host: str = "redis",
        redis_port: int = 6379,
        redis_db: int = 0,
        fallback_enabled: bool = True
    ):
        self.redis_client: Optional[redis.Redis] = None
        self.fallback_cache = InMemoryCache() if fallback_enabled else None
        self.using_redis = False
        
        # Try to connect to Redis
        try:
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            # Test connection
            self.redis_client.ping()
            self.using_redis = True
            logger.info(f"✓ Redis connected: {redis_host}:{redis_port}")
        except (redis.ConnectionError, redis.TimeoutError) as e:
            logger.warning(f"Redis unavailable, using in-memory cache: {e}")
            self.redis_client = None
            self.using_redis = False
    
    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        try:
            if self.using_redis and self.redis_client:
                value = self.redis_client.get(key)
                if value:
                    logger.debug(f"Cache HIT (Redis): {key}")
                    return value
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
        
        # Fallback to memory
        if self.fallback_cache:
            value = self.fallback_cache.get(key)
            if value:
                logger.debug(f"Cache HIT (Memory): {key}")
                return value
        
        logger.debug(f"Cache MISS: {key}")
        return None
    
    def set(self, key: str, value: str, ttl: int = 3600):
        """
        Set value in cache with TTL
        
        Args:
            key: Cache key
            value: Value to store (string)
            ttl: Time to live in seconds (default: 3600 = 1h)
        """
        try:
            if self.using_redis and self.redis_client:
                self.redis_client.setex(key, ttl, value)
                logger.debug(f"Cache SET (Redis): {key} [TTL: {ttl}s]")
                return
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
        
        # Fallback to memory
        if self.fallback_cache:
            self.fallback_cache.set(key, value, ttl)
            logger.debug(f"Cache SET (Memory): {key} [TTL: {ttl}s]")
    
    def delete(self, key: str):
        """Delete key from cache"""
        try:
            if self.using_redis and self.redis_client:
                self.redis_client.delete(key)
                logger.debug(f"Cache DELETE (Redis): {key}")
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
        
        if self.fallback_cache:
            self.fallback_cache.delete(key)
            logger.debug(f"Cache DELETE (Memory): {key}")
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            if self.using_redis and self.redis_client:
                return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
        
        if self.fallback_cache:
            return self.fallback_cache.exists(key)
        
        return False
    
    def get_json(self, key: str) -> Optional[Dict]:
        """Get JSON value from cache"""
        value = self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for key {key}: {e}")
        return None
    
    def set_json(self, key: str, value: Dict, ttl: int = 3600):
        """Set JSON value in cache"""
        try:
            json_str = json.dumps(value, ensure_ascii=False)
            self.set(key, json_str, ttl)
        except Exception as e:
            logger.error(f"JSON encode error: {e}")
    
    def clear_pattern(self, pattern: str):
        """
        Delete all keys matching pattern (Redis only)
        Pattern examples: "session:*", "user:123:*"
        """
        if not self.using_redis or not self.redis_client:
            logger.warning("clear_pattern only available with Redis")
            return
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Deleted {len(keys)} keys matching: {pattern}")
        except Exception as e:
            logger.error(f"Redis KEYS/DELETE error: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = {
            "backend": "redis" if self.using_redis else "memory",
            "redis_available": self.using_redis
        }
        
        try:
            if self.using_redis and self.redis_client:
                info = self.redis_client.info()
                stats.update({
                    "used_memory": info.get("used_memory_human", "N/A"),
                    "connected_clients": info.get("connected_clients", 0),
                    "total_keys": self.redis_client.dbsize(),
                    "uptime_seconds": info.get("uptime_in_seconds", 0)
                })
            elif self.fallback_cache:
                stats.update({
                    "memory_cache_size": len(self.fallback_cache.cache),
                    "memory_cache_max": self.fallback_cache.max_size
                })
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
        
        return stats


# Global cache instance
_cache_instance: Optional[CacheManager] = None


def get_cache() -> CacheManager:
    """Get or create global cache instance"""
    global _cache_instance
    
    if _cache_instance is None:
        redis_host = os.getenv("REDIS_HOST", "redis")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        
        _cache_instance = CacheManager(
            redis_host=redis_host,
            redis_port=redis_port
        )
    
    return _cache_instance
