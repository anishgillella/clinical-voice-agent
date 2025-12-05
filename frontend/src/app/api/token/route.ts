import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: NextRequest) {
    const roomName = req.nextUrl.searchParams.get('room') || 'intake-room';
    const participantName = req.nextUrl.searchParams.get('name') || 'patient';

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
        return NextResponse.json(
            { error: 'LiveKit API credentials not configured' },
            { status: 500 }
        );
    }

    const token = new AccessToken(apiKey, apiSecret, {
        identity: participantName,
        name: participantName,
    });

    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
    });

    const jwt = await token.toJwt();

    return NextResponse.json({
        token: jwt,
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
}
