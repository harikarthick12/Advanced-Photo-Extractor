# APE – Advanced Photo Extractor 🦍📸

**APE** is a real-time, AI-powered photo retrieval system designed for weddings and large events. Using advanced facial recognition, it allows guests to find themselves in thousands of photos instantly by just uploading a single selfie.

## 🚀 How to Run (Fresh Start)

If you have just cloned the project or are starting in a new environment:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Access the App**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!IMPORTANT]
> This project uses `face-api.js` with models loaded via CDN. Ensure you have an active internet connection when running the application for the first time so the AI models can be downloaded to your browser.

## 🛠️ Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS 4, Framer Motion
- **AI**: face-api.js (SSD Mobilenet v1, Face Landmarks, Face Recognition)
- **Backend**: Next.js Route Handlers (Serverless-ready)
- **Database**: Local JSON Persistence (db.json)
- **Storage**: Local Filesystem (`public/uploads`)

## 📸 Main Sections
- **Landing Page**: Overview of the product.
- **Photographer Dashboard**: Create events, upload photos, and trigger AI face extraction.
- **Guest Portal**: Enter an Event ID and scan your face to find your moments.
- **AI Gallery**: View and download matched photos in a high-performance grid.

## 🔒 Privacy
Face descriptors are extracted and compared using AI embeddings. No biometric data is stored permanently; only numerical vectors (descriptors) are used for matching.
