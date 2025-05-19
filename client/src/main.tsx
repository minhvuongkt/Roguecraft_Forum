import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// import { initMinecraftSounds } from "./lib/soundUtils";

document.title = "Roguecraft - Minecraft Forum";

// initMinecraftSounds();

const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content = "Created by Miu2k3";
document.head.appendChild(metaDescription);

// Create app
createRoot(document.getElementById("root")!).render(<App />);
