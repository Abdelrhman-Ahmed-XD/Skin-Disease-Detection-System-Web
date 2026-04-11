interface PredictionRequest {
  imageUrl: string;
}

interface PredictionResponse {
  disease: string;
  confidence: number;
  description: string;
  suggestions: string[];
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