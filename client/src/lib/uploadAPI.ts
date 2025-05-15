/**
 * Hàm xử lý upload file lên server
 * @param file File cần upload
 * @param type Loại upload (chat hoặc topic)
 * @returns Media object định dạng {"1": "path_image_1"}
 */
export async function uploadFile(file: File, type: 'chat' | 'topic'): Promise<Record<string, string>> {
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

    // API trả về định dạng JSON {"1": "/path/to/image"}
    const result = await response.json();
    console.log(`Uploaded file (${type}):`, result);
    
    return result;
  } catch (error) {
    console.error(`Lỗi upload file (${type}):`, error);
    throw error;
  }
}

/**
 * Hàm xử lý upload nhiều file
 * @param files Danh sách file cần upload
 * @param type Loại upload (chat hoặc topic)
 * @returns Object media định dạng {"1":"path_image_1", "2":"path_image_2",...}
 */
export async function uploadMultipleFiles(files: File[], type: 'chat' | 'topic'): Promise<Record<string, string>> {
  if (files.length === 0) {
    return {};
  }
  
  // Nếu chỉ có một file, sử dụng uploadFile
  if (files.length === 1) {
    try {
      return await uploadFile(files[0], type);
    } catch (error) {
      console.error('Lỗi khi upload file đơn:', error);
      throw error;
    }
  }
  
  // Nếu có nhiều file, thử sử dụng API multiple
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
    });
    
    const response = await fetch(`/api/uploads/${type}/multiple`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Lỗi khi tải nhiều file lên');
    }
    
    // API trả về trực tiếp định dạng {"1": "/path/to/file1", "2": "/path/to/file2", ...}
    const result = await response.json();
    console.log(`Uploaded multiple files (${type}):`, result);
    
    return result;
  } catch (error) {
    console.error(`Lỗi upload nhiều file (${type}):`, error);
    
    // Fallback: Upload từng file một nếu API multiple bị lỗi
    console.log('Fallback: Uploading files individually');
    const uploadPromises = files.map((file) => uploadFile(file, type));
    
    try {
      const results = await Promise.all(uploadPromises);
      // Gộp các kết quả thành một object duy nhất
      const combinedResult: Record<string, string> = {};
      
      let counter = 1;
      results.forEach((result) => {
        Object.entries(result).forEach(([_, path]) => {
          combinedResult[counter.toString()] = path as string;
          counter++;
        });
      });
      
      return combinedResult;
    } catch (uploadError) {
      console.error('Fallback upload failed:', uploadError);
      throw uploadError;
    }
  }
}