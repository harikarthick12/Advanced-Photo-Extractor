import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  const file = searchParams.get('file');

  if (!eventId || !file) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  // Prevent directory traversal
  const safeEventId = path.normalize(eventId).replace(/^(\.\.(\/|\\|$))+/, '');
  const safeFile = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, '');

  const filePath = path.join(process.cwd(), 'data', 'uploads', safeEventId, safeFile);

  try {
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const imageBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on extension
    const ext = path.extname(safeFile).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.webp') contentType = 'image/webp';
    if (ext === '.gif') contentType = 'image/gif';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
