import "@/app.css";
import { initOnboarding } from "@/components/Onboarding";

const config = {
  projectName: "{{project-name}}",
  framework: "{{framework}}",
  language: "{{language}}",
  packageManager: "{{package-manager}}",
  linter: "{{linter}}",
};

initOnboarding(config);
