from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import faiss
import io
from PIL import Image

app = FastAPI(title="APE Engine", description="Advanced Photo Extractor ML Microservice")

# Allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to your Next.js domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize InsightFace (ArcFace + RetinaFace)
# Note: On first run, it will download the models to ~/.insightface
try:
    face_app = FaceAnalysis(name='buffalo_l')
    # Set context ID (0 for GPU, -1 for CPU)
    face_app.prepare(ctx_id=-1, det_size=(640, 640))
except Exception as e:
    print(f"Warning: InsightFace not fully loaded (Needs models). Error: {e}")

# In-memory FAISS indices per event (for demonstration)
# In production, use Redis or a persistent vector DB (Pinecone, Milvus)
event_indices = {}
event_images = {} # Maps internal ID to image URL/Metadata

class MatchRequest(BaseModel):
    event_id: str
    threshold: float = 0.55

def read_imagefile(file) -> np.ndarray:
    image = Image.open(io.BytesIO(file))
    # Convert to RGB (OpenCV uses BGR, InsightFace handles RGB)
    image = image.convert('RGB')
    return np.array(image)

@app.post("/api/v1/extract")
async def extract_faces(file: UploadFile = File(...)):
    """
    Extracts face embeddings using ArcFace.
    """
    contents = await file.read()
    img_array = read_imagefile(contents)
    
    # Convert RGB to BGR for InsightFace/OpenCV processing
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    faces = face_app.get(img_bgr)
    
    if len(faces) == 0:
        return {"faces": []}
    
    result = []
    for face in faces:
        result.append({
            "bbox": face.bbox.tolist(),
            "kps": face.kps.tolist(),
            "det_score": float(face.det_score),
            "embedding": face.normed_embedding.tolist() # 512-d vector
        })
        
    return {"faces": result}

@app.post("/api/v1/index/{event_id}")
async def index_event_image(event_id: str, image_id: str, file: UploadFile = File(...)):
    """
    Process an event image and add its faces to the FAISS index.
    This simulates 'Live Real-Time Event Processing'.
    """
    contents = await file.read()
    img_array = read_imagefile(contents)
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    faces = face_app.get(img_bgr)
    if len(faces) == 0:
        return {"status": "no_faces_detected"}
        
    if event_id not in event_indices:
        # 512 dimensions for ArcFace
        event_indices[event_id] = faiss.IndexFlatIP(512) # Inner Product (Cosine Similarity) since embeddings are normed
        event_images[event_id] = []
        
    # Add to FAISS
    embeddings = np.array([face.normed_embedding for face in faces], dtype=np.float32)
    event_indices[event_id].add(embeddings)
    
    # Keep track of mapping
    for _ in faces:
        event_images[event_id].append({
            "image_id": image_id,
            # Could store extra metadata here
        })
        
    return {"status": "success", "faces_indexed": len(faces)}

@app.post("/api/v1/search/{event_id}")
async def search_faces(event_id: str, file: UploadFile = File(...)):
    """
    Takes a guest's selfie, extracts the ArcFace embedding, 
    and searches the FAISS index for matches in milliseconds.
    """
    if event_id not in event_indices:
        raise HTTPException(status_code=404, detail="Event not found or no indexed images")
        
    contents = await file.read()
    img_array = read_imagefile(contents)
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    faces = face_app.get(img_bgr)
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected in selfie")
        
    # Assume the largest/most confident face is the selfie subject
    selfie_face = faces[0]
    query_vector = np.array([selfie_face.normed_embedding], dtype=np.float32)
    
    # Search FAISS
    # For FlatIP, distances are actually cosine similarities (closer to 1.0 is better)
    k = 10 # return top 10 matches
    distances, indices = event_indices[event_id].search(query_vector, k)
    
    matches = []
    # threshold for cosine similarity (e.g. > 0.4 usually means a match for ArcFace)
    sim_threshold = 0.4 
    
    for i, idx in enumerate(indices[0]):
        similarity = distances[0][i]
        if similarity > sim_threshold and idx != -1:
            match_data = event_images[event_id][idx]
            matches.append({
                "image_id": match_data["image_id"],
                "confidence": float(similarity * 100)
            })
            
    # Deduplicate image_ids (if multiple faces in the same image matched)
    unique_matches = {v['image_id']: v for v in matches}.values()
            
    return {"matches": list(unique_matches)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
