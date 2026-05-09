import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { eventId, selfieDescriptor } = await req.json();

    if (!eventId || !selfieDescriptor) {
      return NextResponse.json({ error: 'Missing eventId or selfieDescriptor' }, { status: 400 });
    }

    const event = getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Euclidean distance matching
    // 0.4 was too strict, 0.62 might bring in false positives.
    // 0.55 is the "Golden Ratio" for face-api.js to get high recall without strangers.
    const threshold = 0.55; 
    
    const matchedImages = event.images
      .map((img: any) => {
        if (!img.descriptors || img.descriptors.length === 0) return null;

        // Find the best match (minimum distance) in this image
        let minDistance = Infinity;
        img.descriptors.forEach((descriptor: number[]) => {
          const distance = Math.sqrt(
            descriptor.reduce((sum, val, i) => sum + Math.pow(val - selfieDescriptor[i], 2), 0)
          );
          if (distance < minDistance) {
            minDistance = distance;
          }
        });

        if (minDistance < threshold) {
          return { ...img, distance: minDistance };
        }
        return null;
      })
      .filter((img: any) => img !== null)
      // Sort by distance (closest matches first)
      .sort((a: any, b: any) => a.distance - b.distance);

    return NextResponse.json({
      matches: matchedImages.map((img: any) => ({ 
        id: img.id, 
        url: img.url,
        confidence: Math.max(0, Math.min(100, Math.round((1 - img.distance) * 100)))
      }))
    });
  } catch (error) {
    console.error('Match error:', error);
    return NextResponse.json({ error: 'Failed to find matches' }, { status: 500 });
  }
}
