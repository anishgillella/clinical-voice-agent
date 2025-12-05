import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'AI Voice Intake',
    description: 'Medical intake powered by AI voice agent',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
