import os
import threading
from typing import Optional, List
import random

_model_lock = threading.Lock()


def get_model_id() -> str:
	return os.getenv("MODEL_ID", "mock-model")


def get_text_generation_pipeline():
	return MockTextGeneration()


class MockTextGeneration:
	"""Mock text generation for Windows compatibility"""
	
	def __call__(self, prompts):
		if isinstance(prompts, str):
			prompts = [prompts]
		return [{"generated_text": self._mock_response(p)} for p in prompts]
	
	def _mock_response(self, prompt: str) -> str:
		responses = [
			"This is a mock response for testing purposes.",
			"The system is running in demo mode without AI models.",
			"Mock AI response: Please install proper AI models for production use.",
			"Demo response: The request has been processed successfully.",
		]
		return random.choice(responses)


def generate_batch_with_system_prompt(system_prompt: str, user_prompts: List[str]) -> List[str]:
	pipe = get_text_generation_pipeline()
	prompts = [f"{system_prompt}\n{u}" for u in user_prompts]
	outputs = pipe(prompts)
	results: List[str] = []
	for out in outputs:
		text = out["generated_text"] if isinstance(out, dict) else out[0]["generated_text"]
		results.append(text.strip())
	return results


def generate_with_system_prompt(system_prompt: str, user_prompt: str) -> str:
	return generate_batch_with_system_prompt(system_prompt, [user_prompt])[0]

