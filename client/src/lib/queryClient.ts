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
    console.log(`Making API request: ${method} ${url}`, data);
    
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
    
    const res = await fetch(fullUrl, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`Response received: ${res.status} ${res.statusText}`);
    
    // Check and handle non-JSON responses early
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Invalid JSON response:", {
        url: fullUrl,
        status: res.status,
        contentType,
        responseText: text
      });
      throw new Error(`Expected JSON response but got ${contentType || 'no content type'}. Status: ${res.status}. Response: ${text.slice(0, 100)}...`);
    }

    await throwIfResNotOk(res);
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
