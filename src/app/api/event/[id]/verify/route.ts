import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { pin } = await req.json();

    if (!id || !pin) {
      return NextResponse.json({ error: 'Missing event ID or PIN' }, { status: 400 });
    }

    const event = getEvent(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // If the event has no PIN set (e.g. created before this update), we allow access
    if (!event.pin || event.pin === pin) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
