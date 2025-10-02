from typing import Optional, List

from .models import generate_with_system_prompt, generate_batch_with_system_prompt


def summarize_text(text: str) -> str:
	instruction = (
		"Summarize the following content concisely for a busy professional. "
		"Highlight key points, numbers, and any action items."
	)
	return generate_with_system_prompt(instruction, text)


def generate_key_points(text: str, num_points: int = 3) -> List[str]:
	system = (
		"Extract the top key points from the provided content. "
		f"Return exactly {num_points} concise bullets as plain lines with no numbering and no extra commentary."
	)
	resp = generate_with_system_prompt(system, text)
	lines = [l.strip("-• \t") for l in resp.splitlines() if l.strip()]
	return lines[:num_points]


def generate_action_tasks(text: str, num_tasks: int = 2) -> List[str]:
	system = (
		"From the provided content, generate actionable, specific tasks. "
		f"Return exactly {num_tasks} imperative tasks as plain lines with no numbering."
	)
	resp = generate_with_system_prompt(system, text)
	lines = [l.strip("-• \t") for l in resp.splitlines() if l.strip()]
	return lines[:num_tasks]


def answer_question(context: str, question: str) -> str:
	system = (
		"You are a helpful research assistant. Answer based strictly on the provided context. "
		"If the answer is not in the context, say you don't know."
	)
	user = f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
	return generate_with_system_prompt(system, user)

