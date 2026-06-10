const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadImage = async (file: File): Promise<string> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing in .env file');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'skinsight_scans');

  const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error('Image upload to Cloudinary failed');
  return (await response.json()).secure_url;
};

/** Upload a raw Blob (e.g. PDF) to Cloudinary as a raw file and return the secure URL. */
export const uploadPDFToCloudinary = async (blob: Blob, filename: string): Promise<string> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing in .env file');
  }

  const file = new File([blob], `${filename}.pdf`, { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'skinsight_reports');
  formData.append('resource_type', 'raw');

  const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
      { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error('PDF upload to Cloudinary failed');
  return (await response.json()).secure_url;
};