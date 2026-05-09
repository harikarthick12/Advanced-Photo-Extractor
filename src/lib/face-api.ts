import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  
  const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
  
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
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
    input = img;
  }
  
  // Use SsdMobilenetv1 for high accuracy detection
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  return detection ? Array.from(detection.descriptor) : null;
};

export const getMultipleFaceDescriptors = async (imageElement: HTMLImageElement | HTMLCanvasElement) => {
  await loadModels();
  
  // Detect all faces with a balanced confidence threshold to find background faces without false positives
  const detections = await faceapi
    .detectAllFaces(imageElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
    
  return detections.map(d => Array.from(d.descriptor));
};
