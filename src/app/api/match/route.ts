import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { eventId, selfieDescriptors, selfieImageBase64 } = await req.json();

    if (!eventId || !selfieDescriptors || !Array.isArray(selfieDescriptors) || selfieDescriptors.length === 0) {
      return NextResponse.json({ error: 'Missing eventId or selfieDescriptors' }, { status: 400 });
    }

    const event = getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // --- FAISS & ArcFace Pipeline Integration ---
    if (selfieImageBase64) {
      try {
        // Convert base64 to Blob
        const base64Data = selfieImageBase64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        
        const pyFormData = new FormData();
        pyFormData.append("file", blob, "selfie.jpg");
        
        const pyRes = await fetch(`http://localhost:8000/api/v1/search/${eventId}`, {
          method: 'POST',
          body: pyFormData
        });

        if (pyRes.ok) {
          const pyData = await pyRes.json();
          console.log("FAISS Match successful:", pyData.matches.length, "matches");
          
          // Map Python results back to Next.js gallery format
          const formattedMatches = pyData.matches.map((pyMatch: any) => {
            const dbImage = event.images.find(img => img.id === pyMatch.image_id);
            if (!dbImage) return null;
            return {
              id: dbImage.id,
              url: dbImage.url,
              emotion: 'neutral', // Python backend doesn't currently do emotion detection
              confidence: Math.round(pyMatch.confidence)
            };
          }).filter((m: any) => m !== null);
          
          return NextResponse.json({ matches: formattedMatches });
        }
      } catch (err) {
        console.warn("FAISS Search failed or offline. Falling back to Browser ML matching...");
      }
    }
    // --- End FAISS Pipeline ---

    // --- Multi-selfie Centroid Averaging ---
    let queryDescriptor = Array.isArray(selfieDescriptors[0]) 
      ? selfieDescriptors[0] 
      : selfieDescriptors[0].descriptor;
      
    if (selfieDescriptors.length > 1) {
      const descLength = queryDescriptor.length;
      queryDescriptor = new Array(descLength).fill(0);
      selfieDescriptors.forEach((selfie: any) => {
        const arr = Array.isArray(selfie) ? selfie : selfie.descriptor;
        for (let i = 0; i < descLength; i++) {
          queryDescriptor[i] += arr[i];
        }
      });
      for (let i = 0; i < descLength; i++) {
        queryDescriptor[i] /= selfieDescriptors.length;
      }
    }

    // --- Adaptive Threshold ---
    const allDistances: number[] = [];
    event.images.forEach((img: any) => {
      if (!img.descriptors) return;
      img.descriptors.forEach((item: any) => {
        const descArray = Array.isArray(item) ? item : item.descriptor;
        if (!descArray) return;
        const distance = Math.sqrt(
          descArray.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - queryDescriptor[i], 2), 0)
        );
        allDistances.push(distance);
      });
    });

    let baseThreshold = 0.42; // The tightened gate
    if (allDistances.length > 0) {
      const mean = allDistances.reduce((a, b) => a + b, 0) / allDistances.length;
      const std = Math.sqrt(
        allDistances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / allDistances.length
      );
      // Adaptive cut-off
      const computedThreshold = mean - 2 * std;
      baseThreshold = Math.min(computedThreshold, 0.42);
    }

    const matchedImages = event.images
      .map((img: any) => {
        if (!img.descriptors || img.descriptors.length === 0) return null;

        let minDistance = Infinity;
        let bestCosineSimilarity = -Infinity;
        let usedThreshold = baseThreshold; 
        let bestEmotion = "neutral";
        let bestDescriptor: number[] | null = null;
        let detectionScore = 0;

        img.descriptors.forEach((item: any) => {
          const descArray = Array.isArray(item) ? item : item.descriptor;
          if (!descArray) return;

          // Euclidean Distance against the Centroid
          const distance = Math.sqrt(
            descArray.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - queryDescriptor[i], 2), 0)
          );
          
          // Cosine Similarity against the Centroid
          let dotProduct = 0;
          let normA = 0;
          let normB = 0;
          for (let i = 0; i < descArray.length; i++) {
             dotProduct += descArray[i] * queryDescriptor[i];
             normA += descArray[i] * descArray[i];
             normB += queryDescriptor[i] * queryDescriptor[i];
          }
          const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

          if (distance < minDistance) {
            minDistance = distance;
            bestCosineSimilarity = cosineSimilarity;
            bestDescriptor = descArray;
            
            if (!Array.isArray(item)) {
              if (item.emotion) bestEmotion = item.emotion;
              if (item.score) detectionScore = item.score;
            }
            
            // Feature 2: Clothing/Torso Re-ID
            let isClothingMatch = false;
            const primarySelfie = selfieDescriptors[0];
            if (!Array.isArray(item) && item.shirtColor && !Array.isArray(primarySelfie) && primarySelfie.shirtColor) {
              const colorDist = Math.sqrt(
                Math.pow(item.shirtColor[0] - primarySelfie.shirtColor[0], 2) +
                Math.pow(item.shirtColor[1] - primarySelfie.shirtColor[1], 2) +
                Math.pow(item.shirtColor[2] - primarySelfie.shirtColor[2], 2)
              );
              if (colorDist < 30 && item.shirtColor[0] !== 0) {
                isClothingMatch = true;
              }
            }

            // Apply Adaptive Confidence Thresholding (Research Feature)
            if (!Array.isArray(item)) {
              let adaptiveThreshold = baseThreshold;
              
              if (isClothingMatch) {
                adaptiveThreshold += 0.08;
              }
              if (item.box && (item.box.width < 100 || item.box.height < 100)) {
                adaptiveThreshold += 0.03; 
              } else if (item.box && (item.box.width > 300 || item.box.height > 300)) {
                adaptiveThreshold -= 0.02;
              }
              if (item.score > 0.95) {
                adaptiveThreshold += 0.02;
              } else if (item.score < 0.6) {
                adaptiveThreshold -= 0.04;
              }
              if (!Array.isArray(primarySelfie) && primarySelfie.score > 0.95) {
                adaptiveThreshold += 0.02;
              }

              usedThreshold = adaptiveThreshold;
            }
          }
        });

        // Dual-gate check: Euclidean Distance AND Cosine Similarity
        if (minDistance < usedThreshold && bestCosineSimilarity > 0.9) {
          let rankScore = (1 - minDistance) * 100;
          if (bestEmotion === 'happy') rankScore += 15;
          if (bestEmotion === 'surprised') rankScore += 5;
          if (detectionScore > 0.9) rankScore += 5;

          return { 
            ...img, 
            distance: minDistance, 
            threshold: usedThreshold, 
            emotion: bestEmotion,
            bestDescriptor,
            rankScore
          };
        }
        return null;
      })
      .filter((img: any) => img !== null);

    // --- SVM Verification Layer ---
    if (matchedImages.length > 0) {
      try {
        const galleryDescriptors = matchedImages.map((img: any) => Array.from(img.bestDescriptor));
        const qDesc = Array.from(queryDescriptor);

        const svmRes = await fetch('http://localhost:8000/api/v1/svm_verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query_descriptor: qDesc,
            gallery_descriptors: galleryDescriptors
          })
        });

        if (svmRes.ok) {
          const svmData = await svmRes.json();
          const confidences = svmData.confidences;

          matchedImages.forEach((img: any, index: number) => {
            const svmConfidence = confidences[index];
            img.svmConfidence = svmConfidence;

            // Refine rankScore based on SVM confidence
            if (svmConfidence > 0.7) {
              img.rankScore += (svmConfidence * 20);
            } else if (svmConfidence < 0.4) {
              // Low confidence, penalize score but fallback to Euclidean is maintained
              img.rankScore -= ((1 - svmConfidence) * 20);
            }
          });
          console.log("SVM verification applied successfully.");
        } else {
          console.warn("SVM backend returned error. Falling back to Euclidean.");
        }
      } catch (err) {
        console.warn("SVM verification failed or offline. Falling back to Euclidean-only matching...", err);
      }
    }
    // --- End SVM Verification Layer ---

    // Feature 10: Duplicate Removal
    // If two images have nearly identical facial descriptors (distance < 0.1), they are burst shots. Keep the one with the higher rank score.
    const uniqueMatches: any[] = [];
    matchedImages.forEach((img: any) => {
      let isDuplicate = false;
      
      for (let i = 0; i < uniqueMatches.length; i++) {
        const existing = uniqueMatches[i];
        
        if (img.bestDescriptor && existing.bestDescriptor) {
          const duplicateDistance = Math.sqrt(
            img.bestDescriptor.reduce((sum: number, val: number, idx: number) => sum + Math.pow(val - existing.bestDescriptor[idx], 2), 0)
          );
          
          // 0.15 is a very strict threshold indicating the exact same expression and angle (a burst shot)
          if (duplicateDistance < 0.15) {
            isDuplicate = true;
            // Keep the better photo
            if (img.rankScore > existing.rankScore) {
              uniqueMatches[i] = img;
            }
            break;
          }
        }
      }
      
      if (!isDuplicate) {
        uniqueMatches.push(img);
      }
    });

    // AI Photo Ranking: Sort by the calculated rank score (highest first)
    uniqueMatches.sort((a: any, b: any) => b.rankScore - a.rankScore);

    return NextResponse.json({
      matches: uniqueMatches.map((img: any) => ({ 
        id: img.id, 
        url: img.url,
        emotion: img.emotion || 'neutral',
        confidence: Math.max(0, Math.min(100, Math.round((1 - img.distance) * 100)))
      }))
    });
  } catch (error) {
    console.error('Match error:', error);
    return NextResponse.json({ error: 'Failed to find matches' }, { status: 500 });
  }
}
