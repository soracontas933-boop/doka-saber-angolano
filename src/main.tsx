import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Safety net: capturar erros fatais para evitar tela branca em mobile
window.addEventListener("error", (e) => {
  console.error("[GlobalError]", e.error || e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[UnhandledRejection]", e.reason);
});

// Limpar service workers obsoletos que possam estar a servir bundles partidos
// (causa comum de tela branca após deploys em PWA mobile)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      // Forçar update imediato; se houver waiting, activar já
      reg.update().catch(() => {});
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    });
  }).catch(() => {});

  // Quando um novo SW assume controlo, recarregar uma vez para garantir bundle fresco
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

const rootEl = document.getElementById("root")!;
try {
  createRoot(rootEl).render(<App />);
} catch (err) {
  console.error("[BootError]", err);
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:system-ui;background:#fff;color:#000;text-align:center">
      <h1 style="font-size:20px;margin-bottom:8px">Erro ao carregar a aplicação</h1>
      <p style="font-size:14px;color:#555;margin-bottom:16px">Tenta recarregar a página.</p>
      <button onclick="location.reload()" style="padding:10px 20px;background:#1E9DF1;color:#fff;border:none;border-radius:8px;font-size:14px">Recarregar</button>
    </div>`;
}
