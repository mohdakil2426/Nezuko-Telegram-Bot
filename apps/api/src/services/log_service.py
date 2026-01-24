"""Business logic for log retrieval and monitoring."""

import json

from redis.asyncio import Redis

from src.core.config import get_settings

settings = get_settings()


class LogService:
    def __init__(self) -> None:
        self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.history_key = "nezuko:logs:history"

    async def get_logs(
        self,
        limit: int = 100,
        level: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        """
        Retrieve historical logs from Redis List.
        Note: Redis List doesn't support advanced filtering server-side efficiently.
        We will fetch a batch and filter in memory for this simple implementation.
        For production with heavy logs, use a real DB or specific logging stack (Loki/ELK).
        """
        # Fetch more than limit to allow for filtering fallout
        fetch_limit = limit * 5 if (level or search) else limit

        # Pyrefly/Pyright might be confused about the async nature of the redis client stub
        # But in runtime with redis-py 5.x+, lrange is awaitable.
        raw_logs = await self.redis.lrange(self.history_key, 0, fetch_limit - 1)  # type: ignore

        logs = []
        for raw in raw_logs:
            try:
                entry = json.loads(raw)

                # Apply filters
                if level and entry.get("level") != level:
                    continue

                if search:
                    term = search.lower()
                    msg = entry.get("message", "").lower()
                    logger_name = entry.get("logger", "").lower()
                    if term not in msg and term not in logger_name:
                        continue

                logs.append(entry)

                if len(logs) >= limit:
                    break
            except json.JSONDecodeError:
                continue

        return logs


log_service = LogService()
