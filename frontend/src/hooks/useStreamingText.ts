import { useState, useEffect, useRef } from 'react';

export function useStreamingText(finalText: string, speed: number = 30) {
	const [displayText, setDisplayText] = useState('');
	const [isComplete, setIsComplete] = useState(false);
	const indexRef = useRef(0);
	const intervalRef = useRef<NodeJS.Timeout>();

	useEffect(() => {
		if (!finalText) return;
		
		setDisplayText('');
		setIsComplete(false);
		indexRef.current = 0;
		
		intervalRef.current = setInterval(() => {
			if (indexRef.current < finalText.length) {
				setDisplayText(finalText.slice(0, indexRef.current + 1));
				indexRef.current++;
			} else {
				setIsComplete(true);
				clearInterval(intervalRef.current!);
			}
		}, speed);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [finalText, speed]);

	return { displayText, isComplete };
}
