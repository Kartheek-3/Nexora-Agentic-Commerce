import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Nav } from "./components/layout/Nav";
import { NexoraBackground } from "./components/motion/AmbientLayer";
import { PageTransition } from "./components/motion/PageTransition";
import { GlobalCommerceCore } from "./components/three/GlobalCommerceCore";
import { ProductTour } from "./components/tour/ProductTour";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AgentPage = lazy(() => import("./pages/AgentPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentFailurePage = lazy(() => import("./pages/PaymentFailurePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard"));
const MerchantGuardrails = lazy(() => import("./pages/MerchantGuardrails"));
const MerchantAudit = lazy(() => import("./pages/MerchantAudit"));
const CatalogReadiness = lazy(() => import("./pages/CatalogReadiness"));
const MerchantCampaigns = lazy(() => import("./pages/MerchantCampaigns"));
const ArchitecturePage = lazy(() => import("./pages/ArchitecturePage"));

function Shell() {
  const location = useLocation();
  return (
    <>
      <NexoraBackground />
      <GlobalCommerceCore />
      <Nav />
      <main className="relative z-10">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-24 text-ivory/[0.64]">Loading NEXORA...</div>}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/agent" element={<AgentPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/payment/failure" element={<PaymentFailurePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/merchant" element={<MerchantDashboard />} />
                <Route path="/merchant/products" element={<ShopPage merchant />} />
                <Route path="/merchant/orders" element={<MerchantDashboard focus="orders" />} />
                <Route path="/merchant/revenue" element={<MerchantDashboard focus="revenue" />} />
                <Route path="/merchant/agent" element={<AgentPage merchant />} />
                <Route path="/merchant/guardrails" element={<MerchantGuardrails />} />
                <Route path="/merchant/audit" element={<MerchantAudit />} />
                <Route path="/merchant/campaigns" element={<MerchantCampaigns />} />
                <Route path="/merchant/catalog-readiness" element={<CatalogReadiness />} />
                <Route path="/architecture" element={<ArchitecturePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PageTransition>
          </AnimatePresence>
        </Suspense>
      </main>
      <ProductTour />
    </>
  );
}

export default Shell;
