from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.app.services.zhipu_llm_service import _chat_completions_url, _extract_text_content


def test_chat_completions_url_appends_suffix() -> None:
    assert (
        _chat_completions_url("https://open.bigmodel.cn/api/paas/v4")
        == "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    )


def test_chat_completions_url_keeps_existing_suffix() -> None:
    assert (
        _chat_completions_url("https://open.bigmodel.cn/api/paas/v4/chat/completions")
        == "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    )


def test_extract_text_content_supports_segment_list() -> None:
    assert (
        _extract_text_content(
            [
                {"type": "output_text", "text": "module A() {"},
                {"type": "output_text", "text": "  control { ; }"},
                {"type": "output_text", "text": "}"},
            ]
        )
        == "module A() {\ncontrol { ; }\n}"
    )
