"""
LLM narrator for the security assistant (Groq, OpenAI-compatible API).

The rule-based analyst (assistant.py) gathers the facts — evidence, actions,
references — from live state. The LLM only rewrites those facts into an
analyst-style answer. It is never given tools and can never execute actions;
if the call fails the rule-based answer is returned unchanged.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

from app.schemas import AssistantReply

log = logging.getLogger("nexus.llm")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are NEXUS Analyst, the security assistant of NEXUS, an AI network-security research prototype.
Answer the user's question using ONLY the JSON facts provided. Rules:
- Every number, IP address, host name, threat id and action you mention must appear in the facts. Never invent data.
- You explain and recommend. You cannot execute, approve or change anything; never claim or offer to.
- If the facts do not answer the question, say what is known and what is not.
- Note that the environment is simulated unless the facts say a detection came from live capture.
- Write 1–3 short paragraphs of plain text for a security analyst. No markdown headings, no bullet lists, no preamble."""


class GroqNarrator:
    def __init__(self, api_key: str, model: str = "openai/gpt-oss-120b", timeout: float = 12.0) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.last_error: Optional[str] = None

    @property
    def label(self) -> str:
        return f"NEXUS Analyst · Groq {self.model} (grounded in NEXUS data)"

    async def narrate(self, question: str, draft: AssistantReply, context: dict[str, Any]) -> Optional[str]:
        facts = {
            "question": question,
            "draft_answer": draft.content,
            "evidence": [e.model_dump() for e in draft.evidence],
            "actions_taken_by_nexus": draft.actions_taken,
            "recommendations": draft.recommendations,
            "references": [r.model_dump() for r in draft.references],
            **context,
        }
        payload = {
            "model": self.model,
            "temperature": 0.2,
            "max_tokens": 600,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Facts:\n{json.dumps(facts, default=str)}\n\nQuestion: {question}"},
            ],
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(GROQ_URL, headers={"Authorization": f"Bearer {self.api_key}"}, json=payload)
            if res.status_code != 200:
                self.last_error = f"Groq API {res.status_code}: {res.text[:200]}"
                log.warning(self.last_error)
                return None
            text = res.json()["choices"][0]["message"]["content"].strip()
            self.last_error = None
            return text or None
        except Exception as exc:  # network / parsing — fall back to the rule-based answer
            self.last_error = f"Groq request failed: {exc}"
            log.warning(self.last_error)
            return None
