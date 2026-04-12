export const uploadImage = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing in .env file');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  // This line forces Cloudinary to place the image in the 'skinsight_scans' folder
  formData.append('folder', 'skinsight_scans');

  const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
  );

  if (!response.ok) {
    throw new Error('Image upload to Cloudinary failed');
  }

  const data = await response.json();

  // Returns the secure URL provided by Cloudinary
  return data.secure_url;
};