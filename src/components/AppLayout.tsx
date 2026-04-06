import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import MobileNav from "./MobileNav";
import MobileTopBar from "./MobileTopBar";
import CreditsBar from "./CreditsBar";
import { usePageTracking } from "@/hooks/use-page-tracking";

const AppLayout = () => {
  usePageTracking();
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileTopBar />
        <CreditsBar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
