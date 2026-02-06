import "@/app.css";
import { createRoot } from "react-dom/client";
// you can use aliases too ! (just add them to tsconfig.json)
import Onboarding from "@/components/Onboarding";

const config = {
  projectName: "{{project-name}}",
  framework: "{{framework}}",
  language: "{{language}}",
  packageManager: "{{package-manager}}",
  linter: "{{linter}}",
};

function main() {
  // Create a container for the React application
  // We append this to document.body to ensure it sits above the Spotify UI
  const container = document.createElement("div");
  container.id = "spicetify-onboarding-root";
  document.body.appendChild(container);

  const root = createRoot(container);

  // Render the Onboarding UI
  root.render(<Onboarding config={config} />);
}

main();
