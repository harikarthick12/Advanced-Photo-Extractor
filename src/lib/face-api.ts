import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  
  const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
  
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]);
  
  modelsLoaded = true;
};

export const getFaceDescriptor = async (imageElement: HTMLImageElement | HTMLCanvasElement | File) => {
  await loadModels();
  
  let input: any = imageElement;
  if (imageElement instanceof File) {
    const img = new Image();
    img.src = URL.createObjectURL(imageElement);
    await new Promise((resolve) => (img.onload = resolve));
    
    // Apply Illumination Normalization (Feature 2)
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Auto-levels / Contrast stretching to fix bad lighting
      let min = 255, max = 0;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        if (lum < min) min = lum;
        if (lum > max) max = lum;
      }
      
      if (max > min) {
        const scale = 255 / (max - min);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, (data[i] - min) * scale));     // R
          data[i+1] = Math.min(255, Math.max(0, (data[i+1] - min) * scale)); // G
          data[i+2] = Math.min(255, Math.max(0, (data[i+2] - min) * scale)); // B
        }
        ctx.putImageData(imageData, 0, 0);
      }
      input = canvas;
    } else {
      input = img;
    }
  }
  
  // Use SsdMobilenetv1 for high accuracy detection
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;

  // Feature 2: Clothing/Torso Re-ID for Selfie
  let shirtColor = [0, 0, 0];
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const torsoY = detection.detection.box.y + detection.detection.box.height;
      const torsoHeight = detection.detection.box.height;
      
      canvas.width = detection.detection.box.width;
      canvas.height = torsoHeight;
      
      // Draw from the original image element (not the normalized one to get true colors)
      ctx.drawImage(
        imageElement, 
        detection.detection.box.x, torsoY, detection.detection.box.width, torsoHeight,
        0, 0, detection.detection.box.width, torsoHeight
      );
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let r=0, g=0, b=0, count=0;
      
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i+1];
        b += data[i+2];
        count++;
      }
      
      if (count > 0) {
        shirtColor = [Math.round(r/count), Math.round(g/count), Math.round(b/count)];
      }
    }
  } catch(e) {}
  
  return {
    descriptor: Array.from(detection.descriptor),
    score: detection.detection.score,
    box: detection.detection.box,
    shirtColor: shirtColor
  };
};

export const getMultipleFaceDescriptors = async (imageElement: HTMLImageElement | HTMLCanvasElement) => {
  await loadModels();
  
  // Detect all faces with a balanced confidence threshold to find background faces without false positives
  const detections = await faceapi
    .detectAllFaces(imageElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 }))
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptors();
    
  return detections
    .filter(d => d.detection.box.width >= 80 && d.detection.box.height >= 80)
    .map(d => {
    // Find dominant emotion
    let dominantEmotion = "neutral";
    let maxProb = 0;
    if (d.expressions) {
      for (const [emotion, prob] of Object.entries(d.expressions)) {
        if (prob > maxProb) {
          maxProb = prob;
          dominantEmotion = emotion;
        }
      }
    }

    // Feature 2: Clothing/Torso Re-ID (Extract Shirt Color)
    let shirtColor = [0, 0, 0];
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Torso is roughly the area directly below the face
        const torsoY = d.detection.box.y + d.detection.box.height;
        const torsoHeight = d.detection.box.height; // sample an area as tall as the face
        
        canvas.width = d.detection.box.width;
        canvas.height = torsoHeight;
        
        ctx.drawImage(
          imageElement, 
          d.detection.box.x, torsoY, d.detection.box.width, torsoHeight,
          0, 0, d.detection.box.width, torsoHeight
        );
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        let r=0, g=0, b=0, count=0;
        
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i+1];
          b += data[i+2];
          count++;
        }
        
        if (count > 0) {
          shirtColor = [Math.round(r/count), Math.round(g/count), Math.round(b/count)];
        }
      }
    } catch(e) {
      // Cross-origin issues might prevent canvas extraction, fallback silently
    }

    return {
      descriptor: Array.from(d.descriptor),
      score: d.detection.score,
      box: d.detection.box,
      emotion: dominantEmotion,
      emotionScore: maxProb,
      shirtColor: shirtColor
    };
  });
};

export const checkImageQuality = (imageElement: HTMLImageElement | HTMLCanvasElement, detection: any) => {
  // 1. Check Face Size (Should be at least 15% of the image)
  const imgWidth = imageElement.width || (imageElement as HTMLImageElement).naturalWidth;
  const imgHeight = imageElement.height || (imageElement as HTMLImageElement).naturalHeight;
  
  const faceArea = detection.box.width * detection.box.height;
  const imgArea = imgWidth * imgHeight;
  const faceRatio = faceArea / imgArea;
  
  const isTooSmall = faceRatio < 0.05; // Face is less than 5% of the image
  
  // 2. Check Detection Confidence
  const isLowConfidence = detection.score < 0.85; // We want high confidence for selfies
  
  // 3. Basic Blur Check via Canvas (Simplified Laplacian Variance)
  let isBlurry = false;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Just check the face bounding box area for sharpness
      canvas.width = detection.box.width;
      canvas.height = detection.box.height;
      
      // Draw just the face area
      ctx.drawImage(
        imageElement, 
        detection.box.x, detection.box.y, detection.box.width, detection.box.height,
        0, 0, detection.box.width, detection.box.height
      );
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Calculate simple local contrast (Standard Deviation of luminance)
      let sum = 0;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        // Luminance
        const lum = 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];
        sum += lum;
        count++;
      }
      const mean = sum / count;
      
      let varianceSum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const lum = 0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2];
        varianceSum += Math.pow(lum - mean, 2);
      }
      const variance = varianceSum / count;
      
      // If variance is very low, the image is washed out or blurry
      isBlurry = variance < 100;
    }
  } catch (e) {
    console.warn("Could not calculate blur", e);
  }

  let error = null;
  if (isBlurry) error = "Photo appears blurry or washed out. Please ensure good lighting.";
  else if (isTooSmall) error = "Face is too far away. Please move closer to the camera.";
  else if (isLowConfidence) error = "Face not clearly visible. Please face the camera directly.";

  return {
    isGood: !error,
    error
  };
};
