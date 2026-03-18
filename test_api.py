import asyncio
import httpx
import json

async def test():
    async with httpx.AsyncClient() as client:
        for provider, key, model in [
            ("Google", "AIzaSy_dummy_key_12345", "gemini-1.5-pro"),
            ("Anthropic", "sk-ant-dummy_key_12345", "claude-3-5-sonnet"),
            ("OpenAI", "sk-dummy_key_12345", "gpt-4o")
        ]:
            res = await client.post(
                "http://127.0.0.1:8000/api/monitor/custom-models/verify", # usually
                json={"api_key": key, "model_name": model}
            )
            print(f"{provider}: {res.status_code} {res.text}")

asyncio.run(test())
