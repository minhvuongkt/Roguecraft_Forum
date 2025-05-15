/**
 * Hàm xử lý upload file lên server
 * @param file File cần upload
 * @param type Loại upload (chat hoặc topic)
 * @returns Media object với URL của file đã upload
 */
export async function uploadFile(file: File, type: 'chat' | 'topic'): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`/api/uploads/${type}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Lỗi khi tải file lên');
    }

    return await response.json();
  } catch (error) {
    console.error(`Lỗi upload file (${type}):`, error);
    throw error;
  }
}

/**
 * Hàm xử lý upload nhiều file
 * @param files Danh sách file cần upload
 * @param type Loại upload (chat hoặc topic)
 * @returns Danh sách các media object
 */
export async function uploadMultipleFiles(files: File[], type: 'chat' | 'topic'): Promise<any[]> {
  const uploadPromises = files.map((file) => uploadFile(file, type));
  return Promise.all(uploadPromises);
}