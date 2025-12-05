'use client';

interface ConnectionStatusProps {
    status: 'disconnected' | 'connecting' | 'connected';
    onConnect: () => void;
    onDisconnect: () => void;
}

export default function ConnectionStatus({
    status,
    onConnect,
    onDisconnect,
}: ConnectionStatusProps) {
    const statusColors = {
        disconnected: 'bg-red-100 text-red-700 border-red-200',
        connecting: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        connected: 'bg-green-100 text-green-700 border-green-200',
    };

    const statusText = {
        disconnected: '● Disconnected',
        connecting: '● Connecting...',
        connected: '● Connected - Speak now!',
    };

    return (
        <div className="flex items-center justify-between">
            <div className={`px-4 py-2 rounded-lg border ${statusColors[status]}`}>
                {statusText[status]}
            </div>

            {status === 'disconnected' ? (
                <button
                    onClick={onConnect}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    🎙️ Start Interview
                </button>
            ) : status === 'connected' ? (
                <button
                    onClick={onDisconnect}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                    End Call
                </button>
            ) : null}
        </div>
    );
}
