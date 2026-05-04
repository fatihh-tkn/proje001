"""
test_smoke.py — agent_graph LG.2 smoke test.

Bağımsız çalıştırma:
    cd backend
    python -m services.agent_graph.test_smoke

Testler:
  1. Imports (yeni node'lar dahil)
  2. build_graph() compile
  3. Supervisor: command-driven intent (deterministik)
  4. Supervisor: dosya bağlamı → dosya_qa
  5. Send API yapısı: hata_cozumu komutu → error_solver dispatched
  6. Send API yapısı: zli_report_query → zli_finder dispatched
  7. Uçtan uca general intent (rag_search → aggregator → msg_polish?)
  8. PostgresSaver context

LLM çağrıları gerçek backend ister; modeller yoksa graceful fallback.
"""

from __future__ import annotations

import asyncio
import io
import json
import sys
import time
from pathlib import Path

# Windows konsolu cp1254 ise UTF-8'e zorla
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


# Backend kökünü path'e ekle (script doğrudan çalıştırılırsa)
BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def test_1_imports():
    print("\n[1] Importlar...", end=" ")
    from services.agent_graph.state import AgentState  # noqa
    from services.agent_graph.graph import build_graph  # noqa
    from services.agent_graph.llm_adapter import call_llm, stream_llm, build_messages  # noqa
    from services.agent_graph.checkpoint import open_checkpointer  # noqa
    from services.agent_graph.nodes import (  # noqa
        supervisor_node, rag_search_node, error_solver_node,
        zli_finder_node, n8n_trigger_node, aggregator_node,
        msg_polish_node,
    )
    print("[OK]")


async def test_2_compile_no_checkpointer():
    print("[2] Graph compile (checkpointer=None)...", end=" ")
    from services.agent_graph.graph import build_graph
    graph = build_graph(checkpointer=None)
    assert graph is not None
    nodes = list(graph.get_graph().nodes.keys())
    expected = {"supervisor", "rag_search", "error_solver",
                "zli_finder", "n8n_trigger", "aggregator", "msg_polish"}
    missing = expected - set(nodes)
    assert not missing, f"eksik node: {missing}"
    print(f"[OK] (nodes={len(nodes)})")


async def test_3_supervisor_command_driven():
    print("[3] Supervisor: command='zli_report_query' → rapor_arama...", end=" ")
    from services.agent_graph.nodes import supervisor_node
    state = {
        "user_message": "Stok hareketi raporu lazım",
        "original_message": "Stok hareketi raporu lazım",
        "session_id": "test-session-3",
        "command": "zli_report_query",
    }
    result = await supervisor_node(state)
    assert result["intent"] == "rapor_arama", f"intent={result['intent']}"
    plan_nodes = [p["node"] for p in result["plan"]]
    assert "zli_finder" in plan_nodes, f"plan={plan_nodes}"
    print(f"[OK] plan={plan_nodes}")


async def test_4_supervisor_file_context():
    print("[4] Supervisor: file_name verili → dosya_qa...", end=" ")
    from services.agent_graph.nodes import supervisor_node
    state = {
        "user_message": "Bu dosyada ne yazıyor?",
        "original_message": "Bu dosyada ne yazıyor?",
        "session_id": "test-session-4",
        "file_name": "ornek.pdf",
    }
    result = await supervisor_node(state)
    assert result["intent"] == "dosya_qa", f"intent={result['intent']}"
    plan_nodes = [p["node"] for p in result["plan"]]
    assert "rag_search" in plan_nodes, f"plan={plan_nodes}"
    print(f"[OK] plan={plan_nodes}")


async def test_5_supervisor_error_solve():
    print("[5] Supervisor: command='error_solve' → hata_cozumu (rag+error_solver)...", end=" ")
    from services.agent_graph.nodes import supervisor_node
    state = {
        "user_message": "ME083 hatası alıyorum",
        "original_message": "ME083 hatası alıyorum",
        "session_id": "test-session-5",
        "command": "error_solve",
    }
    result = await supervisor_node(state)
    assert result["intent"] == "hata_cozumu", f"intent={result['intent']}"
    plan_nodes = [p["node"] for p in result["plan"]]
    assert "error_solver" in plan_nodes, f"plan={plan_nodes}"
    assert "rag_search" in plan_nodes, "RAG paralel çalışmalı"
    print(f"[OK] plan={plan_nodes}")


async def test_6_full_graph_invoke_general():
    """
    Uçtan uca: supervisor → rag_search → aggregator → (msg_polish veya END).
    LLM yoksa aggregator hata mesajı yazar ama graph yine de tamamlanır.
    """
    print("[6] Uçtan uca general intent...", end=" ")
    from services.agent_graph.graph import build_graph
    graph = build_graph(checkpointer=None)
    state = {
        "user_message": "Merhaba, kısaca kendini tanıt.",
        "original_message": "Merhaba, kısaca kendini tanıt.",
        "session_id": "test-session-6",
        "started_at": time.time() * 1000,
    }
    t0 = time.time()
    final = await graph.ainvoke(state)
    elapsed = (time.time() - t0) * 1000

    assert "intent" in final
    executed = final.get("nodes_executed") or []
    assert "supervisor" in executed, f"executed={executed}"
    assert "aggregator" in executed, f"executed={executed}"

    reply = final.get("final_reply", "")
    has_reply = bool(reply and not reply.startswith("❌"))
    print(f"[OK] intent={final['intent']}, executed={executed}, "
          f"reply={'var' if has_reply else 'YOK'}, {elapsed:.0f}ms")
    if has_reply:
        print(f"       -> \"{reply[:100]}{'...' if len(reply) > 100 else ''}\"")
    else:
        print(f"       -> {reply[:200] if reply else '(boş)'}")


async def test_7_full_graph_invoke_error_solve():
    """
    Hızlı aksiyon: error_solve. Specialist parallel: rag_search + error_solver.
    Aggregator JSON pass-through yapmalı.
    """
    print("[7] Uçtan uca error_solve (paralel rag+error)...", end=" ")
    from services.agent_graph.graph import build_graph
    graph = build_graph(checkpointer=None)
    state = {
        "user_message": "ME083 hatası alıyorum, satınalma siparişinde.",
        "original_message": "ME083 hatası alıyorum, satınalma siparişinde.",
        "session_id": "test-session-7",
        "command": "error_solve",
        "started_at": time.time() * 1000,
    }
    t0 = time.time()
    final = await graph.ainvoke(state)
    elapsed = (time.time() - t0) * 1000

    executed = final.get("nodes_executed") or []
    timings = final.get("node_timings") or {}
    print(f"[OK] executed={executed}, timings={timings}, {elapsed:.0f}ms")
    reply = final.get("final_reply", "")
    if reply:
        # JSON beklenir; başlıyor mu '{' veya 'json' ile?
        is_json_like = reply.lstrip().startswith(("{", "```json"))
        print(f"       -> reply={'JSON' if is_json_like else 'metin'} "
              f"({len(reply)} karakter)")


async def test_8_streaming_runner():
    """
    runner.stream_run() generator'ı SSE satırları üretiyor mu?
    LLM/DB yoksa progress + error/done event'leri yine de gelmeli.
    """
    print("[8] Streaming runner (stream_run → SSE)...", end=" ")
    from services.agent_graph.runner import stream_run

    state = {
        "user_message": "Streaming testi",
        "original_message": "Streaming testi",
        "session_id": "test-session-stream",
        "started_at": time.time() * 1000,
    }

    events: list[dict] = []
    line_count = 0
    async for line in stream_run(state, checkpointer=None):
        line_count += 1
        # SSE format: 'data: {...}\n\n'
        assert line.startswith("data: "), f"satır SSE formatında değil: {line[:60]!r}"
        try:
            payload = json.loads(line[6:].strip())
            events.append(payload)
        except Exception:
            pass

    types = [e.get("type") for e in events]
    assert "progress" in types or "error" in types, f"progress/error yok: {types}"
    has_terminal = ("done" in types) or ("error" in types)
    assert has_terminal, f"done/error event'i yok: {types}"
    print(f"[OK] {line_count} satır, types={types}")


async def test_9_postgres_checkpoint():
    print("[8] PostgresSaver context açma...", end=" ")
    try:
        from services.agent_graph.checkpoint import open_checkpointer
        async with open_checkpointer() as cp:
            assert cp is not None
            print(f"[OK] ({type(cp).__name__})")
    except Exception as e:
        print(f"[FAIL] {type(e).__name__}: {e}")
        print("       -> DB erişimi/Windows ProactorEventLoop yoksa beklenen")


async def main():
    print("=" * 60)
    print("agent_graph LG.2 Smoke Test (multi-specialist + parallel)")
    print("=" * 60)
    test_1_imports()
    await test_2_compile_no_checkpointer()
    await test_3_supervisor_command_driven()
    await test_4_supervisor_file_context()
    await test_5_supervisor_error_solve()
    await test_6_full_graph_invoke_general()
    await test_7_full_graph_invoke_error_solve()
    await test_8_streaming_runner()
    await test_9_postgres_checkpoint()
    print("\n" + "=" * 60)
    print("LG.2 smoke test tamamlandı")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
