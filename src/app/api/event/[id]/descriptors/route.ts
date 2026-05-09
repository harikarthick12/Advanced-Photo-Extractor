import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { imageId, descriptors } = await req.json();

    const db = getDb();
    const event = db.events[id];
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const image = event.images.find((img: any) => img.id === imageId);
    if (image) {
      image.descriptors = descriptors;
      saveDb(db);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
