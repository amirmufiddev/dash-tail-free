"use client";
import React from "react";
import Header from "@/components/partials/header";
import Sidebar from "@/components/partials/sidebar";
import { cn } from "@/lib/utils";
import { useSidebar, useThemeStore } from "@/store";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Footer from "@/components/partials/footer";
import { useMediaQuery } from "@/hooks/use-media-query";
import ThemeCustomize from "@/components/partials/customizer/theme-customizer";
import MobileSidebar from "@/components/partials/sidebar/mobile-sidebar";
import HeaderSearch from "@/components/header-search";
import { useMounted } from "@/hooks/use-mounted";
import { siteConfig } from "@/config/site";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { collapsed, sidebarType } = useSidebar();
  const [open, setOpen] = React.useState(false);
  const { layout } = useThemeStore();
  const location = usePathname();
  const isMobile = useMediaQuery("(min-width: 768px)");
  const mounted = useMounted();

  const activeLayout = mounted ? layout : siteConfig.layout;
  const activeSidebarType = mounted
    ? sidebarType
    : siteConfig.layout === "semibox"
      ? "popover"
      : siteConfig.sidebarType;
  const activeCollapsed = mounted ? collapsed : false;

  const isSemibox = activeLayout === "semibox";
  const isHorizontal = activeLayout === "horizontal";
  const isModule = !isSemibox && !isHorizontal && activeSidebarType === "module";

  const wrapperMargin = isHorizontal
    ? ""
    : activeCollapsed
      ? "xl:ml-[72px]"
      : isSemibox
        ? "xl:ml-[272px]"
        : activeSidebarType !== "module"
          ? "xl:ml-[248px]"
          : "xl:ml-[300px]";

  const innerPadding = isSemibox
    ? "md:pt-6 pb-[37px] pt-[15px] md:px-6 px-4 page-min-height-semibox"
    : isHorizontal
      ? "md:pt-6 pb-[37px] pt-[15px] md:px-6 px-4 page-min-height-horizontal"
      : isModule
        ? "md:pt-6 md:pb-[37px] pb-28 pt-[15px] md:px-6 px-4 page-min-height"
        : "md:pt-6 pb-[37px] pt-[15px] md:px-6 px-4 page-min-height";

  return (
    <>
      {mounted && <Header handleOpenSearch={() => setOpen(true)} />}
      {mounted && !isHorizontal && <Sidebar />}

      <div className={cn("content-wrapper transition-all duration-150 ", wrapperMargin)}>
        <div className={cn(innerPadding)}>
          <div className={cn({ "xl:mx-14": isSemibox })}>
            <LayoutWrapper
              isMobile={isMobile}
              setOpen={setOpen}
              open={open}
              location={location}
            >
              {children}
            </LayoutWrapper>
          </div>
        </div>
      </div>

      {mounted && <Footer handleOpenSearch={() => setOpen(true)} />}
      {mounted && (!isModule || isMobile) && <ThemeCustomize />}
    </>
  );
};

export default MainLayout;

const LayoutWrapper = ({
  children,
  setOpen,
  open,
  location,
}: {
  children: React.ReactNode;
  isMobile: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  open: boolean;
  location: string | null;
}) => {
  return (
    <>
      <motion.div
        key={location ?? "page"}
        initial="pageInitial"
        animate="pageAnimate"
        exit="pageExit"
        variants={{
          pageInitial: {
            opacity: 0,
            y: 50,
          },
          pageAnimate: {
            opacity: 1,
            y: 0,
          },
          pageExit: {
            opacity: 0,
            y: -50,
          },
        }}
        transition={{
          type: "tween",
          ease: "easeInOut",
          duration: 0.5,
        }}
      >
        <main>{children}</main>
      </motion.div>

      <MobileSidebar className="left-[300px]" />
      <HeaderSearch open={open} setOpen={setOpen} />
    </>
  );
};
