from typing import Optional

from .models import generate_with_system_prompt


def summarize_text(text: str) -> str:
	instruction = (
		"Summarize the following content concisely for a busy professional. "
		"Highlight key points, numbers, and any action items."
	)
	return generate_with_system_prompt(instruction, text)


def answer_question(context: str, question: str) -> str:
	system = (
		"You are a helpful research assistant. Answer based strictly on the provided context. "
		"If the answer is not in the context, say you don't know."
	)
	user = f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
	return generate_with_system_prompt(system, user)

