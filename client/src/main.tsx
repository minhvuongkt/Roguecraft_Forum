import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set page title and metadata
document.title = "[ROGUECRAFT] Forum & Chat";

// Add meta description
const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content =
  "Một ứng dụng kết hợp giữa Forum và Chat, cho phép người dùng tạo bài viết, bình luận và trò chuyện trong thời gian thực.";
document.head.appendChild(metaDescription);

// Create app
createRoot(document.getElementById("root")!).render(<App />);
