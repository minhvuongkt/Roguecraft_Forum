import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set page title and metadata
document.title = "Roguecraft - Minecraft Forum";

// Add meta description
const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content = "Created by Miu2k3";
document.head.appendChild(metaDescription);

// Create app
createRoot(document.getElementById("root")!).render(<App />);
