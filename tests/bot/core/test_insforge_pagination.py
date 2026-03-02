"""
Unit tests for InsForge client pagination functionality.

Tests:
- _chunk_list helper function
- get_group_channels pagination
- get_groups_for_channel pagination
"""

from unittest.mock import AsyncMock, patch

import pytest


class TestChunkList:
    """Tests for _chunk_list helper function."""

    def test_chunk_list_basic(self):
        """_chunk_list splits list into equal chunks."""
        from apps.bot.core.insforge_client import _chunk_list

        items = list(range(10))
        chunks = _chunk_list(items, 3)

        assert chunks == [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]

    def test_chunk_list_exact_multiple(self):
        """_chunk_list handles exact multiples."""
        from apps.bot.core.insforge_client import _chunk_list

        items = list(range(6))
        chunks = _chunk_list(items, 3)

        assert chunks == [[0, 1, 2], [3, 4, 5]]

    def test_chunk_list_empty(self):
        """_chunk_list handles empty list."""
        from apps.bot.core.insforge_client import _chunk_list

        chunks = _chunk_list([], 10)
        assert chunks == []

    def test_chunk_list_single_item(self):
        """_chunk_list handles single item."""
        from apps.bot.core.insforge_client import _chunk_list

        chunks = _chunk_list([1], 10)
        assert chunks == [[1]]

    def test_chunk_list_chunk_size_one(self):
        """_chunk_list with chunk_size=1 creates single-item chunks."""
        from apps.bot.core.insforge_client import _chunk_list

        items = [1, 2, 3]
        chunks = _chunk_list(items, 1)

        assert chunks == [[1], [2], [3]]


class TestGetGroupChannelsPagination:
    """Tests for get_group_channels pagination."""

    @pytest.mark.asyncio
    async def test_get_group_channels_no_links(self):
        """Returns empty list when no channel links exist."""
        from apps.bot.core.insforge_client import get_group_channels

        with patch("apps.bot.core.insforge_client.get_records", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = []

            result = await get_group_channels(123)

            assert result == []
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_group_channels_single_chunk(self):
        """Fetches all channels in single query when under chunk size."""
        from apps.bot.core.insforge_client import get_group_channels

        with patch("apps.bot.core.insforge_client.get_records", new_callable=AsyncMock) as mock_get:
            # First call returns links, second returns channel data
            mock_get.side_effect = [
                [{"channel_id": 1}, {"channel_id": 2}],  # links
                [
                    {"channel_id": 1, "title": "Channel 1"},
                    {"channel_id": 2, "title": "Channel 2"},
                ],  # channels
            ]

            result = await get_group_channels(123)

            assert len(result) == 2
            assert mock_get.call_count == 2

    @pytest.mark.asyncio
    async def test_get_group_channels_multiple_chunks(self):
        """Paginates when channel count exceeds chunk size."""
        from apps.bot.core.insforge_client import _CHUNK_SIZE, get_group_channels

        with patch("apps.bot.core.insforge_client.get_records", new_callable=AsyncMock) as mock_get:
            # Create more links than chunk size
            num_links = _CHUNK_SIZE + 10
            links = [{"channel_id": i} for i in range(num_links)]

            # First call returns links
            mock_get.side_effect = [
                links,
                [{"channel_id": i, "title": f"Channel {i}"} for i in range(_CHUNK_SIZE)],
                [{"channel_id": i, "title": f"Channel {i}"} for i in range(_CHUNK_SIZE, num_links)],
            ]

            result = await get_group_channels(123)

            assert len(result) == num_links
            assert mock_get.call_count == 3  # 1 for links + 2 chunks


class TestGetGroupsForChannelPagination:
    """Tests for get_groups_for_channel pagination."""

    @pytest.mark.asyncio
    async def test_get_groups_for_channel_no_links(self):
        """Returns empty list when no group links exist."""
        from apps.bot.core.insforge_client import get_groups_for_channel

        with patch("apps.bot.core.insforge_client.get_records", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = []

            result = await get_groups_for_channel(456)

            assert result == []
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_groups_for_channel_single_chunk(self):
        """Fetches all groups in single query when under chunk size."""
        from apps.bot.core.insforge_client import get_groups_for_channel

        with patch("apps.bot.core.insforge_client.get_records", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = [
                [{"group_id": 1}, {"group_id": 2}],  # links
                [
                    {"group_id": 1, "owner_id": 100, "enabled": True},
                    {"group_id": 2, "owner_id": 200, "enabled": True},
                ],
            ]

            result = await get_groups_for_channel(456)

            assert len(result) == 2
            assert mock_get.call_count == 2

    @pytest.mark.asyncio
    async def test_get_groups_for_channel_multiple_chunks(self):
        """Paginates when group count exceeds chunk size."""
        from apps.bot.core.insforge_client import _CHUNK_SIZE, get_groups_for_channel

        with patch("apps.bot.core.insforge_client.get_records", new_callable=AsyncMock) as mock_get:
            num_links = _CHUNK_SIZE + 5
            links = [{"group_id": i} for i in range(num_links)]

            mock_get.side_effect = [
                links,
                [{"group_id": i, "owner_id": i * 10, "enabled": True} for i in range(_CHUNK_SIZE)],
                [
                    {"group_id": i, "owner_id": i * 10, "enabled": True}
                    for i in range(_CHUNK_SIZE, num_links)
                ],
            ]

            result = await get_groups_for_channel(456)

            assert len(result) == num_links
            assert mock_get.call_count == 3
