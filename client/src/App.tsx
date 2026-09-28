import { Toaster } from "sonner";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function AppContent() {
  const { theme } = useTheme();
  return <><Home /><Toaster theme={theme} position="top-right" richColors /></>;
}

export default function App() {
  return <ThemeProvider defaultTheme="dark" switchable><AppContent /></ThemeProvider>;
}
