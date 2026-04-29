from __future__ import annotations

from paranet.agent.core.events.action import BrowseURLAction
from paranet.agent.core.events.observation import BrowserOutputObservation


class WebToolHandler:
    def handle_browse(self, action: BrowseURLAction) -> BrowserOutputObservation:
        import httpx
        url = action.url
        if not url:
            return BrowserOutputObservation(content="Error: url is required.", url=url)
        try:
            resp = httpx.get(url, timeout=30, follow_redirects=True)
            resp.raise_for_status()
            content = resp.text[:8000]
            return BrowserOutputObservation(content=content, url=url)
        except httpx.HTTPStatusError as exc:
            return BrowserOutputObservation(content=f"HTTP {exc.response.status_code} for {url}", url=url)
        except Exception as exc:
            return BrowserOutputObservation(content=f"Failed to fetch {url}: {exc}", url=url)
