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
  if (!url || url === 'http://localhost:5000') {
    // Mock the response if there is no backend configured
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          disease: 'Melanoma (Malignant)',
          confidence: 94.5,
          description: 'A type of skin cancer that develops from the pigment-producing cells known as melanocytes.',
          suggestions: [
            'Consult a dermatologist immediately for a proper diagnosis.',
            'Avoid excessive sun exposure.',
            'Keep track of any changes in moles.'
          ]
        });
      }, 2000);
    });
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