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

const renderError = (title: string, message: string) => {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:system-ui;background:#fff;color:#000;text-align:center">
      <div style="background:#FEE2E2;color:#991B1B;padding:16px;border-radius:12px;margin-bottom:20px;max-width:400px">
        <h1 style="font-size:18px;font-weight:bold;margin-bottom:8px">${title}</h1>
        <p style="font-size:14px;line-height:1.5">${message}</p>
      </div>
      <button onclick="location.reload()" style="padding:12px 24px;background:#1E9DF1;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
        Recarregar Aplicação
      </button>
    </div>`;
};

// Capturar erros globais que podem ocorrer antes ou durante a renderização
window.addEventListener("error", (e) => {
  console.error("[GlobalError]", e.error || e.message);
  // Se o root estiver vazio (tela branca), mostrar erro amigável
  if (rootEl.innerHTML === "" || rootEl.innerHTML.includes("loading")) {
    renderError("Ocorreu um erro inesperado", "A aplicação encontrou um problema técnico. Por favor, recarregue a página.");
  }
});

try {
  const root = createRoot(rootEl);
  root.render(<App />);
} catch (err) {
  console.error("[BootError]", err);
  renderError("Erro ao iniciar", "Não foi possível carregar a aplicação. Verifique sua conexão ou tente novamente.");
}
