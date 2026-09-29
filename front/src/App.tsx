import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster as Sonner } from "@/modules/shared/components/ui/sonner";
import { Toaster } from "@/modules/shared/components/ui/toaster";
import { TooltipProvider } from "@/modules/shared/components/ui/tooltip";
import AppRouter from "@/app/router";
import { GlobalWidget } from "@/modules/agent/components/GlobalWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRouter />
        <GlobalWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
