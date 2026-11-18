import { ComponentReference } from "@/components/design-system/component-reference";
import { ThemeProvider } from "@/components/theme-provider";

export default function DesignSystemPage() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ComponentReference />
    </ThemeProvider>
  );
}
