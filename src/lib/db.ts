import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

// Ensure directories exist
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ events: {} }));
}

export interface EventImage {
  id: string;
  url: string;
  descriptors: number[][]; // Face descriptors
}

export interface EventData {
  id: string;
  name: string;
  images: EventImage[];
}

export const getDb = () => {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
};

export const saveDb = (data: any) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

export const getEvent = (id: string): EventData | null => {
  const db = getDb();
  return db.events[id] || null;
};

export const createEvent = (id: string, name: string) => {
  const db = getDb();
  db.events[id] = { id, name, images: [] };
  saveDb(db);
  return db.events[id];
};

export const addImageToEvent = (eventId: string, imageUrl: string, descriptors: number[][]) => {
  const db = getDb();
  if (!db.events[eventId]) return null;
  
  const image: EventImage = {
    id: Math.random().toString(36).substring(7),
    url: imageUrl,
    descriptors
  };
  
  db.events[eventId].images.push(image);
  saveDb(db);
  return image;
};
