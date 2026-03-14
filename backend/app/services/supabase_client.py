"""
Supabase async client singleton for server-side operations.
Uses the SERVICE_ROLE_KEY which bypasses RLS – backend only!
"""

import os
from dotenv import load_dotenv
from supabase import create_async_client, AsyncClient

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

_client: AsyncClient | None = None


async def get_supabase() -> AsyncClient:
    """Return the async Supabase client, creating it on first call."""
    global _client
    if _client is None:
        _client = await create_async_client(SUPABASE_URL, SUPABASE_KEY)
    return _client
