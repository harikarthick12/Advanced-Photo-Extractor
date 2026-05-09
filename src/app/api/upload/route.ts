import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { createEvent, addImageToEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const eventName = formData.get('eventName') as string;
    const files = formData.getAll('files') as File[];

    if (!eventName || files.length === 0) {
      return NextResponse.json({ error: 'Missing event name or files' }, { status: 400 });
    }

    const eventId = uuidv4().substring(0, 8);
    createEvent(eventId, eventName);

    const uploadDir = path.join(process.cwd(), 'data', 'uploads', eventId);
    await fs.mkdir(uploadDir, { recursive: true });

    const savedImages = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      
      const imageUrl = `/api/image?eventId=${eventId}&file=${fileName}`;
      
      // In a real world app, we would process embeddings here.
      // For this "ready to use" project, we'll store the images first.
      // The browser will later extract embeddings if we don't have a heavy backend.
      // However, to make it "ready to use", I'll add the image to the DB.
      const image = addImageToEvent(eventId, imageUrl, []);
      savedImages.push(image);
    }

    return NextResponse.json({ eventId, eventName, images: savedImages });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}
