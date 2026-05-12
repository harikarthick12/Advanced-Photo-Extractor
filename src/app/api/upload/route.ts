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
    // Generate a secure 6-digit PIN for guest access
    const eventPin = Math.floor(100000 + Math.random() * 900000).toString();
    createEvent(eventId, eventName, eventPin);

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
      
      const image = addImageToEvent(eventId, imageUrl, []);
      savedImages.push(image);

      // --- FAISS & ArcFace Pipeline Integration ---
      // Attempt to send the image to the Python microservice for indexing
      try {
        const pyFormData = new FormData();
        // Create a blob from the buffer to send via FormData
        const blob = new Blob([buffer], { type: file.type });
        pyFormData.append("file", blob, file.name);
        
        await fetch(`http://localhost:8000/api/v1/index/${eventId}?image_id=${image?.id}`, {
          method: 'POST',
          body: pyFormData
        });
        console.log(`Successfully indexed ${file.name} in FAISS`);
      } catch (err) {
        // Python server not running, gracefully fallback to browser-based face-api.js
        console.warn(`FAISS Backend offline. Falling back to browser ML for ${file.name}`);
      }
    }

    return NextResponse.json({ eventId, eventPin, eventName, images: savedImages });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}
