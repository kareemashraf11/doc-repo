import redis
import json
from typing import Optional, Any
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


class CacheService:

    @staticmethod
    def get(key: str) -> Optional[Any]:
        try:
            value = redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    @staticmethod
    def set(key: str, value: Any, ttl: int = 300) -> bool:
        try:
            redis_client.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    @staticmethod
    def delete(key: str) -> bool:
        try:
            redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    @staticmethod
    def delete_pattern(pattern: str) -> bool:
        try:
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
            return True
        except Exception as e:
            print(f"Cache delete pattern error: {e}")
            return False

    @staticmethod
    def generate_search_key(query: str, tags: list, page: int, page_size: int) -> str:
        tags_str = ",".join(sorted(tags)) if tags else ""
        return f"search:{query or 'all'}:{tags_str}:{page}:{page_size}"
