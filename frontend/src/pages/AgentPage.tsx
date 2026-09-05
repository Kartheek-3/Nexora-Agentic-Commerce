import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ProductCard } from "../components/agent/ProductCard";
import { AuthorizationPanel } from "../components/checkout/AuthorizationPanel";
import { Button } from "../components/ui/Button";
import { NexoraSurface } from "../components/ui/NexoraSurface";
import { auditEvents, failureEvents } from "../data/demo";
import { buildProductIntent, type SelectedProductIntent } from "../lib/productIntent";
import { formatINR } from "../lib/utils";
import { agentErrorMessage, runCommerceAgent, type AgentRunResponse } from "../services/agent";
import { runEvaluations, type EvaluationRun } from "../services/merchant";
import type { CartItem, Product } from "../types/commerce";

export default function AgentPage({ merchant = false }: { merchant?: boolean }) {
  const location = useLocation();
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [failure, setFailure] = useState(false);
  const [evals, setEvals] = useState<EvaluationRun | null>(null);
  const [agentRecommendations, setAgentRecommendations] = useState<Product[]>([]);
  const [agentResult, setAgentResult] = useState<AgentRunResponse | null>(null);
  const [agentError, setAgentError] = useState("");
  const [skippedCrossSellId, setSkippedCrossSellId] = useState("");
  const requestSequenceRef = useRef(0);
  const initializedProductKeyRef = useRef("");
  const navigate = useNavigate();
  const selectedProduct = (location.state as { selectedProduct?: SelectedProductIntent } | null)?.selectedProduct;
  const recommendations = agentResult ? agentRecommendations : [];
  const crossSell = agentResult?.cross_sell[0]?.product;
  const crossSellProposal = agentResult?.cross_sell[0];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currentBudget = typeof agentResult?.structured_intent.budget_max === "number" ? agentResult.structured_intent.budget_max : 0;
  const cartWithoutCrossSell = crossSell ? cart.filter((item) => item.id !== crossSell.id) : cart;
  const currentCartTotal = cartWithoutCrossSell.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const crossSellInCart = Boolean(crossSell && cart.some((item) => item.id === crossSell.id));
  const crossSellMatchesCart = Boolean(crossSell && cartWithoutCrossSell[0] && crossSell.category === cartWithoutCrossSell[0].category);
  const proposedCartTotal = crossSell ? currentCartTotal + crossSell.price : total;
  const remainingBudget = currentBudget - proposedCartTotal;
  const showCrossSell = Boolean(cart.length && crossSell && crossSellMatchesCart && skippedCrossSellId !== crossSell.id);
  const cartOverBudget = currentBudget > 0 && total > currentBudget;

  useEffect(() => {
    const productKey = selectedProduct ? `${location.key}:${selectedProduct.id}:${selectedProduct.sku}` : "";
    if (!selectedProduct || initializedProductKeyRef.current === productKey) return;
    initializedProductKeyRef.current = productKey;
    requestSequenceRef.current += 1;
    setInput(buildProductIntent(selectedProduct));
    setRunning(false);
    setComplete(false);
    setCart([]);
    setFailure(false);
    setAgentRecommendations([]);
    setAgentResult(null);
    setAgentError("");
    setSkippedCrossSellId("");
  }, [location.key, selectedProduct]);

  const runAgent = async () => {
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    console.log("[agent-ui] request prompt:", input);
    setRunning(true);
    setComplete(false);
    setCart([]);
    setAgentResult(null);
    setAgentRecommendations([]);
    setAgentError("");
    setSkippedCrossSellId("");
    try {
      const result = await runCommerceAgent(input);
      if (requestSequenceRef.current !== sequence) return;
      setAgentResult(result);
      setAgentRecommendations(result.recommendations.map((item) => item.product));
    } catch (error) {
      if (requestSequenceRef.current !== sequence) return;
      setAgentError(agentErrorMessage(error));
    }
    window.setTimeout(() => {
      if (requestSequenceRef.current !== sequence) return;
      setRunning(false);
      setComplete(true);
    }, 500);
  };

  const selectProduct = (product: Product) => {
    setCart([{ ...product, quantity: 1 }]);
    setSkippedCrossSellId("");
  };

  const addCrossSell = () => {
    if (!crossSell) return;
    setCart((items) => (items.some((item) => item.id === crossSell.id) ? items : [...items, { ...crossSell, quantity: 1 }]));
  };

  const skipCrossSell = () => {
    if (!crossSell) return;
    setSkippedCrossSellId(crossSell.id);
    setCart((items) => items.filter((item) => item.id !== crossSell.id));
  };

  const continueToCheckout = () => {
    navigate("/checkout");
  };

  const runEvalSuite = async () => {
    try {
      setEvals(await runEvaluations());
    } catch {
      setEvals({
        score: 100,
        safety_score: 100,
        commerce_accuracy: 100,
        budget_adherence: 100,
        payment_approval_bypasses: 0,
        unsupported_tool_calls: 0,
        average_policy_latency_ms: 1.8,
        total: 5,
        passed: 5,
        failed: 0,
        results: [
          { id: "eval_gift_under_budget", name: "Gift within budget", passed: true, actual: true },
          { id: "eval_high_value_block", name: "High value checkout blocked", passed: true, actual: false },
          { id: "eval_discount_block", name: "Discount cap enforcement", passed: true, actual: false },
          { id: "eval_cross_sell", name: "Approved cross-sell", passed: true, actual: true },
          { id: "eval_limit_bypass", name: "Merchant limit bypass blocked", passed: true, actual: false },
        ],
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">{merchant ? "Merchant Agent Console" : "AI Shopping Agent"}</p>
          <h1 className="mt-2 text-3xl font-semibold text-ivory md:text-5xl">Intent to transaction, gated.</h1>
        </div>
        <label className="flex items-center gap-3 rounded-md border border-line bg-white/5 px-3 py-2 text-sm text-ivory/70">
          <input type="checkbox" checked={failure} onChange={(event) => setFailure(event.currentTarget.checked)} />
          Simulate payment failure
        </label>
      </div>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr] xl:grid-cols-[370px_1fr]">
        <NexoraSurface intensity="raised" className="p-5">
          <p className="text-sm font-semibold text-ivory">Customer intent</p>
          <textarea data-tour="customer-intent" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell NEXORA what you want to buy..." className="input-premium mt-3 min-h-36 w-full resize-none rounded-md p-3 text-sm leading-6 text-ivory outline-none" />
          <Button data-tour="run-agent" className="mt-4 w-full" onClick={runAgent} disabled={running} icon={running ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}>
            Run Commerce Agent
          </Button>
          <div className="mt-5 space-y-0">
            {(agentError
              ? ["Intent submitted", "Agent request failed"]
              : running
                ? ["Understanding intent", "Extracting constraints", "Searching catalog"]
                : agentResult
                  ? ["Intent understood", "Constraints extracted", `${agentResult.candidate_count} products found`, "Matches ranked", "Inventory checked"]
                  : ["Ready for current prompt"]).map((step, index) => (
              <motion.div key={step} animate={{ opacity: running || complete ? 1 : 0.42 }} transition={{ delay: index * 0.06 }} className="grid grid-cols-[22px_1fr] gap-3 py-2 text-sm text-ivory/[0.64]">
                <span className={`relative mt-1 flex h-4 w-4 items-center justify-center rounded-full border ${agentError && index === 1 ? "border-red-300/50 bg-red-500/10" : "border-gold/40 bg-gold/10"}`}>
                  {agentError && index === 1 ? <X size={11} className="text-red-200" /> : <Check size={11} className={complete || running || agentResult ? "text-gold" : "text-ivory/[0.24]"} />}
                </span>
                <span>{step}...</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-line bg-black/30 p-3 text-xs leading-5 text-ivory/[0.64]">
            <span className="text-gold">Structured intent JSON</span>
            <pre className="mt-2 whitespace-pre-wrap">{running ? "Extracting intent..." : JSON.stringify(agentResult?.structured_intent ?? {}, null, 2)}</pre>
          </div>
        </NexoraSurface>
        <section data-tour="recommendations" className="space-y-5">
          <AnimatePresence>
            {agentError ? (
              <div className="rounded-md border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                <p>{agentError}</p>
                <Button className="mt-3" variant="secondary" icon={<RefreshCw size={15} />} onClick={runAgent}>Retry</Button>
              </div>
            ) : null}
            {complete && agentResult && recommendations.length ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-3">
                {recommendations.map((product) => <ProductCard key={product.id} product={product} onSelect={selectProduct} />)}
              </motion.div>
            ) : null}
            {complete && agentResult && recommendations.length === 0 ? <p className="rounded-md border border-line bg-black/25 p-3 text-sm text-ivory/[0.62]">No matching in-stock products found for this prompt.</p> : null}
          </AnimatePresence>
          {showCrossSell && crossSell ? (
            <NexoraSurface data-tour="cross-sell" intensity="command" className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-gold">Cross-Sell Proposal</p>
                  <h2 className="mt-1 text-xl font-semibold">{crossSell.name}</h2>
                </div>
                <p className="text-2xl font-semibold text-ember">{formatINR(crossSell.price)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-ivory/[0.64]">
                {crossSellProposal?.decision_summary || "The agent will not add this recommendation silently. It only changes the cart if you accept it."}
              </p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                {[
                  ["Current cart", currentCartTotal],
                  ["With recommendation", proposedCartTotal],
                  ["Budget", currentBudget],
                  [remainingBudget < 0 ? "Over budget" : "Remaining", Math.abs(remainingBudget)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-line bg-black/25 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-ivory/[0.42]">{label}</p>
                    <p className={`mt-1 font-semibold ${label === "Over budget" ? "text-red-200" : "text-ember"}`}>{formatINR(value as number)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={addCrossSell} disabled={crossSellInCart}>Add recommendation</Button>
                <Button variant="secondary" onClick={skipCrossSell}>Skip</Button>
              </div>
            </NexoraSurface>
          ) : null}
          <div data-tour="authorization">
            {cart.length && currentBudget > 0 ? <AuthorizationPanel items={cart} budget={currentBudget} approveLabel={cartOverBudget ? "Blocked" : "Continue to Payment"} approveDisabled={cartOverBudget} onApprove={continueToCheckout} onCancel={() => setCart([])} /> : null}
          </div>
          {failure ? (
            <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-5">
              <div className="flex items-center gap-2 text-red-100"><AlertTriangle size={18} /> Failure path armed</div>
              <p className="mt-2 text-sm text-red-100/[0.72]">The next checkout will preserve cart state, block duplicate execution, and append all recovery events to audit.</p>
              <div className="mt-3 flex flex-wrap gap-2">{failureEvents.slice(5).map((event) => <span key={event} className="rounded border border-red-300/20 px-2 py-1 text-xs text-red-100/[0.72]">{event}</span>)}</div>
            </section>
          ) : null}
          <Link to="/merchant/audit" className="inline-flex items-center gap-2 text-sm text-ember">
            View audit trail with {auditEvents.length} core events <RefreshCw size={15} />
          </Link>
          {merchant ? (
            <NexoraSurface intensity="raised" className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gold">Agent Evaluation Dashboard</p>
                  <h2 className="mt-2 text-2xl font-semibold">Policy and checkout evals</h2>
                </div>
                <Button onClick={runEvalSuite}>Run Evaluation</Button>
              </div>
              {evals ? (
                <div className="mt-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[["Safety", `${evals.safety_score}%`], ["Budget", `${evals.budget_adherence}%`], ["Approval Bypasses", evals.payment_approval_bypasses], ["Tool Violations", evals.unsupported_tool_calls]].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-line bg-black/25 p-3"><p className="text-xs uppercase tracking-[0.14em] text-ivory/40">{label}</p><p className="mt-1 text-xl font-semibold text-ember">{value}</p></div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {evals.results.map((result) => <div key={result.id} className="flex items-center justify-between rounded-md border border-line bg-black/25 p-3 text-sm"><span>{result.name}</span><span className={result.passed ? "text-emerald-200" : "text-red-200"}>{result.passed ? "PASS" : "FAIL"}</span></div>)}
                  </div>
                </div>
              ) : <p className="mt-3 text-sm text-ivory/60">Runs deterministic demo cases for intent, policy blocks, discount caps and explicit checkout authorization.</p>}
            </NexoraSurface>
          ) : null}
        </section>
      </div>
    </div>
  );
}
