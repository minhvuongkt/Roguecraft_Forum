/**
 * Hàm xử lý upload file lên server
 * @param file File cần upload
 * @param type Loại upload (chat hoặc topic)
 * @returns Media object định dạng {"1": "path_image_1"}
 */
export async function uploadFile(file: File, type: 'chat' | 'topic'): Promise<Record<string, string>> {
  // Validate file before attempting upload
  if (!file) {
    console.error('No file provided for upload');
    throw new Error('Không có file được chọn');
  }
  
  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    console.error(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    throw new Error(`File ${file.name} quá lớn. Kích thước tối đa là 5MB.`);
  }
  
  // Validate file type (image only)
  if (!file.type.startsWith('image/')) {
    console.error(`Invalid file type: ${file.type}`);
    throw new Error('Chỉ chấp nhận file hình ảnh');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log(`Uploading file: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    const response = await fetch(`/api/uploads/${type}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Try to get detailed error
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Lỗi khi tải file lên (${response.status})`);
      } catch (jsonError) {
        // If can't parse JSON, use status text
        throw new Error(`Lỗi khi tải file lên: ${response.status} ${response.statusText}`);
      }
    }

    // API trả về định dạng JSON {"1": "/path/to/image"}
    try {
      const result = await response.json();
      
      // Validate result format
      if (!result || typeof result !== 'object') {
        throw new Error('Định dạng phản hồi từ server không hợp lệ');
      }
      
      console.log(`Uploaded file (${type}):`, result);
      return result;
    } catch (jsonError) {
      console.error('Error parsing upload response:', jsonError);
      throw new Error('Lỗi xử lý phản hồi từ server');
    }
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
  if (!files || files.length === 0) {
    console.log('No files to upload, returning empty object');
    return {};
  }
  
  // Kiểm tra kích thước file
  for (const file of files) {
    // Giới hạn 5MB cho mỗi file
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`File ${file.name} quá lớn. Kích thước tối đa là 5MB.`);
    }
  }
  
  // Nếu chỉ có một file, sử dụng uploadFile
  if (files.length === 1) {
    try {
      const result = await uploadFile(files[0], type);
      console.log('Single file upload result:', result);
      return result;
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