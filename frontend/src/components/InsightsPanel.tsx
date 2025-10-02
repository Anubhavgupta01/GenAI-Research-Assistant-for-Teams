interface InsightsPanelProps {
	documentId: string | null;
	onSummarize: () => void;
	onExtractKeyPoints: () => void;
	onGenerateTasks: () => void;
	loading: boolean;
}

export function InsightsPanel({ documentId, onSummarize, onExtractKeyPoints, onGenerateTasks, loading }: InsightsPanelProps) {
	const actions = [
		{
			id: 'summarize',
			label: 'Summarize Document',
			icon: '📝',
			description: 'Generate a concise summary',
			action: onSummarize,
		},
		{
			id: 'keypoints',
			label: 'Extract Key Points',
			icon: '🔑',
			description: 'Identify main points and insights',
			action: onExtractKeyPoints,
		},
		{
			id: 'tasks',
			label: 'Generate Tasks',
			icon: '✅',
			description: 'Create actionable items',
			action: onGenerateTasks,
		},
	];

	return (
		<div className="w-80 bg-gray-50 dark:bg-gray-850 border-l border-gray-200 dark:border-gray-700 flex flex-col">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Insights</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
					Quick actions for your document
				</p>
			</div>

			<div className="flex-1 p-4 space-y-3">
				{!documentId ? (
					<div className="text-center text-gray-500 dark:text-gray-400 mt-8">
						<div className="text-4xl mb-2">📄</div>
						<p className="text-sm">Upload a document to see insights</p>
					</div>
				) : (
					<>
						{actions.map((action) => (
							<button
								key={action.id}
								onClick={action.action}
								disabled={loading}
								className="w-full p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<div className="flex items-start gap-3">
									<div className="text-xl">{action.icon}</div>
									<div className="flex-1">
										<div className="font-medium text-gray-900 dark:text-white text-sm">
											{action.label}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{action.description}
										</div>
									</div>
								</div>
							</button>
						))}
					</>
				)}
			</div>

			<div className="p-4 border-t border-gray-200 dark:border-gray-700">
				<div className="text-xs text-gray-500 dark:text-gray-400">
					💡 Tip: Use keyboard shortcuts to navigate faster
				</div>
			</div>
		</div>
	);
}
