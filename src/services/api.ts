export interface PredictionRequest {
  imageUrl: string;
  photoType: 'phone' | 'dermo';
}

export interface PredictionResponse {
  status: 'no_lesion' | 'bad_photo' | 'healthy' | 'unknown' | 'low_confidence' | 'known';
  disease: string;
  disease_code?: string;
  confidence: number;
  entropy?: number;
  segmented_url: string | null;
  description: string;
  tips: string[];
  precautions: string[];
  sources: string[];
  message: string | null;
}

export const predictSkinDisease = async (request: PredictionRequest): Promise<PredictionResponse> => {
  const url = import.meta.env.VITE_FLASK_URL;

  if (!url) {
    throw new Error('Flask backend URL not configured. Please set VITE_FLASK_URL in .env');
  }

  const res = await fetch(`${url}/api/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error('Prediction API failed');
  }

  return await res.json();
};