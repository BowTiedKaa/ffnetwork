import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initVisitor, track } from "@/lib/tracking/visitor";

let bootstrapped = false;

export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!bootstrapped) {
      bootstrapped = true;
      void initVisitor().then(() => {
        track("page_view", { path: location.pathname });
      });
      return;
    }
    track("page_view", { path: location.pathname });
  }, [location.pathname]);

  return null;
}