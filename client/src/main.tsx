import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set page title and metadata
document.title = "ForumChat - Kết hợp Forum & Chat";

// Add meta description
const metaDescription = document.createElement('meta');
metaDescription.name = "description";
metaDescription.content = "ForumChat - Nền tảng kết hợp forum thảo luận và chat trực tuyến. Chia sẻ, trao đổi và kết nối với cộng đồng.";
document.head.appendChild(metaDescription);

// Create app
createRoot(document.getElementById("root")!).render(<App />);
