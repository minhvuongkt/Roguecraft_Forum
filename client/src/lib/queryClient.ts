import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // Log the request with truncated data for large objects
    let logData: any;
    if (data) {
      if (typeof data === 'object') {
        const safeData: Record<string, any> = { ...data as object };
        
        // Truncate long string fields for logging
        Object.entries(safeData).forEach(([key, value]) => {
          if (typeof value === 'string' && value.length > 200) {
            safeData[key] = value.substring(0, 200) + '... [truncated]';
          }
        });
        
        logData = safeData;
      } else {
        logData = data;
      }
    }
      logWithGroup(`API Request: ${method} ${url}`, logData || 'No data');
    
    // Fix URL handling to ensure proper API paths
    let fullUrl = url;
    if (!url.startsWith('http')) {
      // Make sure we don't double the /api path when VITE_API_URL already includes it
      if (API_BASE_URL.endsWith('/api') && url.startsWith('/api')) {
        fullUrl = `${API_BASE_URL}${url.substring(4)}`;
      } else {
        fullUrl = `${API_BASE_URL}${url}`;
      }
    }
    
    console.log(`Full URL: ${fullUrl}`);
    
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json"
      },
      credentials: "include",
    };
      // Handle data serialization safely
    if (data) {
      try {
        // Pre-process data for better serialization
        const processedData = structuredClone(data);
        
        // Special handling for media objects to ensure they're serializable
        if (processedData && typeof processedData === 'object' && 'media' in processedData) {
          const media = (processedData as any).media;
          if (media !== null && typeof media !== 'object') {
            console.warn('Converting non-object media to null');
            (processedData as any).media = null;
          }
        }
        
        fetchOptions.body = JSON.stringify(processedData);
        console.log('Request payload serialized successfully');
      } catch (error) {
        console.error("Error serializing request data:", error);
        throw new Error("Failed to serialize request data: " + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
    
    // Execute fetch with timeout and better error handling
    let res: Response;
    try {
      res = await Promise.race([
        fetch(fullUrl, fetchOptions),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        )
      ]) as Response;
    } catch (error) {
      console.error(`Network error when fetching ${method} ${url}:`, error);
      throw new Error(`Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log(`Response received: ${res.status} ${res.statusText}`);
      // Check if the response is successful first
    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      let errorDetail;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const errorJson = await res.json();
          logWithGroup("API Error Response (JSON)", {
            url: fullUrl,
            status: res.status,
            error: errorJson
          }, true);
          
          // Handle structured error response
          if (typeof errorJson === 'object' && errorJson !== null) {
            if (errorJson.message) {
              errorDetail = errorJson.message;
            } else if (errorJson.error) {
              errorDetail = errorJson.error;
            } else if (errorJson.details) {
              errorDetail = errorJson.details;
            } else {
              errorDetail = JSON.stringify(errorJson);
            }
          } else {
            errorDetail = JSON.stringify(errorJson);
          }
        } catch (e) {
          const text = await res.text();
          logWithGroup("API Error Response (Parse Error)", {
            url: fullUrl,
            status: res.status,
            text,
            parseError: e
          }, true);
          errorDetail = text;
        }
      } else {
        const text = await res.text();
        logWithGroup("API Error Response (Non-JSON)", {
          url: fullUrl,
          status: res.status,
          contentType,
          text
        }, true);
        errorDetail = text;
      }
      
      throw new Error(`${res.status}: ${errorDetail || res.statusText}`);
    }
    
    // For successful responses, verify JSON content type
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.warn("Response is not JSON but request was successful:", {
        url: fullUrl,
        status: res.status,
        contentType,
        responseText: text.slice(0, 100)
      });
    }

    return res;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        headers: {
          "Accept": "application/json"
        },
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Nếu response không phải JSON, ném lỗi
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Invalid response:", await res.text());
        throw new Error("Server trả về không phải JSON");
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
  };

// Enhanced logging helper
function logWithGroup(title: string, data: any, isError = false) {
  if (isError) {
    console.group(`🛑 ${title}`);
  } else {
    console.group(`🔍 ${title}`);
  }
  
  if (data instanceof Error) {
    console.error(data);
  } else if (typeof data === 'object' && data !== null) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
  
  console.trace('Call stack');
  console.groupEnd();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
