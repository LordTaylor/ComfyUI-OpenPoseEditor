import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const EXT_NAME = "OpenPoseEditor";
const NODE_NAME = "OpenPoseEditorNode";
const EDITOR_URL = "/openpose_editor/index.html";

// Track all open editor instances: nodeId → {iframe, node}
const openEditors = new Map();

// ─── postMessage helpers ───────────────────────────────────────────────────────

function invokeEditorCommand(iframeWin, method, payload = []) {
    iframeWin.postMessage(
        { cmd: "openpose-3d", method, type: "call", payload },
        "*"
    );
}

function waitForEditorMessage(method, types = ["return", "event"], timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            window.removeEventListener("message", handler);
            reject(new Error(`Timeout waiting for ${method}`));
        }, timeoutMs);

        function handler(e) {
            const d = e.data;
            if (d?.cmd === "openpose-3d" && d?.method === method && types.includes(d?.type)) {
                clearTimeout(timer);
                window.removeEventListener("message", handler);
                resolve(d.payload);
            }
        }
        window.addEventListener("message", handler);
    });
}

async function waitForEditorReady(iframeWin, retries = 30) {
    for (let i = 0; i < retries; i++) {
        try {
            invokeEditorCommand(iframeWin, "GetAppVersion");
            await waitForEditorMessage("GetAppVersion", ["return"], 1000);
            return true;
        } catch {
            await new Promise(r => setTimeout(r, 300));
        }
    }
    return false;
}

// ─── Image upload ──────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function uploadImage(dataUrl, filename) {
    const blob = dataUrlToBlob(dataUrl);
    const form = new FormData();
    form.append("image", blob, filename);
    form.append("overwrite", "true");
    const resp = await api.fetchApi("/upload/image", { method: "POST", body: form });
    const json = await resp.json();
    return json.name;
}

// ─── Capture & upload from editor ─────────────────────────────────────────────

async function captureFromEditor(iframe, node, statusFn = () => {}) {
    statusFn("Capturing pose...");
    invokeEditorCommand(iframe.contentWindow, "MakeImages");
    const images = await waitForEditorMessage("MakeImages", ["return", "event"], 10000);

    const map = { pose: "pose_file", depth: "depth_file", canny: "canny_file" };
    for (const [key, widgetName] of Object.entries(map)) {
        const dataUrl = images?.[key];
        if (!dataUrl) continue;
        statusFn(`Uploading ${key}...`);
        const filename = await uploadImage(dataUrl, `openpose_${key}.png`);
        const widget = node.widgets?.find(w => w.name === widgetName);
        if (widget) widget.value = filename;
    }

    app.graph.setDirtyCanvas(true, true);
    statusFn("✓ Captured");
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

function openPoseEditorModal(node) {
    const nodeId = node.id;
    const w = node.widgets?.find(w => w.name === "width")?.value ?? 512;
    const h = node.widgets?.find(w => w.name === "height")?.value ?? 768;

    // Overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.7);
        display:flex; align-items:center; justify-content:center;
        z-index:10000;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
        width:90vw; height:90vh;
        display:flex; flex-direction:column;
        background:#1a1a1a; border-radius:8px;
        overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.5);
    `;

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.style.cssText = `
        display:flex; align-items:center; justify-content:space-between;
        padding:8px 16px; background:#2a2a2a; border-bottom:1px solid #444;
        flex-shrink:0; gap:8px;
    `;

    const title = document.createElement("span");
    title.textContent = `✏️ Open Pose Editor  —  ${w}×${h}`;
    title.style.cssText = "color:#fff; font-size:14px; font-weight:bold; flex:1;";

    const hint = document.createElement("span");
    hint.textContent = "Design your pose • export happens automatically on Queue or Close";
    hint.style.cssText = "color:#888; font-size:11px;";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close & Save";
    closeBtn.style.cssText = `
        padding:6px 14px; background:#4CAF50; color:#fff;
        border:none; border-radius:4px; cursor:pointer; font-size:13px;
        font-weight:bold; white-space:nowrap;
    `;

    toolbar.appendChild(title);
    toolbar.appendChild(hint);
    toolbar.appendChild(closeBtn);

    // Status bar
    const statusBar = document.createElement("div");
    statusBar.style.cssText = `
        padding:4px 16px; background:#111; color:#aaa;
        font-size:11px; flex-shrink:0; min-height:22px;
    `;
    statusBar.textContent = "Loading editor...";
    const setStatus = (msg, color = "#aaa") => {
        statusBar.textContent = msg;
        statusBar.style.color = color;
    };

    // iFrame
    const iframe = document.createElement("iframe");
    iframe.src = `${EDITOR_URL}?width=${w}&height=${h}`;
    iframe.style.cssText = "flex:1; border:none; width:100%;";

    container.appendChild(toolbar);
    container.appendChild(iframe);
    container.appendChild(statusBar);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Register this editor
    openEditors.set(nodeId, { iframe, node });

    iframe.onload = async () => {
        const ready = await waitForEditorReady(iframe.contentWindow);
        setStatus(
            ready
                ? "✓ Editor ready — design pose, then Queue Prompt or Close & Save"
                : "⚠ Editor failed to load",
            ready ? "#4CAF50" : "#f44"
        );
    };

    // Auto-capture on close
    const doCloseAndSave = async () => {
        closeBtn.disabled = true;
        try {
            await captureFromEditor(iframe, node, (msg) => setStatus(msg, "#FFA500"));
            setStatus("✓ Pose saved to node", "#4CAF50");
        } catch (err) {
            console.error("[OpenPoseEditor] capture error:", err);
            setStatus(`⚠ ${err.message}`, "#f44");
        }
        openEditors.delete(nodeId);
        setTimeout(() => overlay.remove(), 800);
    };

    closeBtn.onclick = doCloseAndSave;
    // ESC key also saves
    const keyHandler = (e) => {
        if (e.key === "Escape") { document.removeEventListener("keydown", keyHandler); doCloseAndSave(); }
    };
    document.addEventListener("keydown", keyHandler);
}

// ─── Intercept Queue Prompt ────────────────────────────────────────────────────
// If any editor modal is open when user queues, auto-capture first.

const _origQueuePrompt = app.queuePrompt.bind(app);
app.queuePrompt = async function (number, batchCount) {
    if (openEditors.size > 0) {
        for (const [nodeId, { iframe, node }] of openEditors) {
            try {
                await captureFromEditor(iframe, node, (msg) => console.log(`[OpenPoseEditor] ${msg}`));
            } catch (err) {
                console.warn(`[OpenPoseEditor] Auto-capture failed for node ${nodeId}:`, err);
            }
        }
    }
    return _origQueuePrompt(number, batchCount);
};

// ─── Extension registration ────────────────────────────────────────────────────

app.registerExtension({
    name: EXT_NAME,

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const orig = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            orig?.apply(this, arguments);

            // DOM button — visible in all ComfyUI frontend versions
            const btn = document.createElement("button");
            btn.textContent = "✏️ Open Pose Editor";
            btn.style.cssText = [
                "width:calc(100% - 16px)", "margin:6px 8px 2px 8px",
                "padding:8px 12px", "background:#2e7d32", "color:#fff",
                "border:none", "border-radius:6px", "cursor:pointer",
                "font-size:13px", "font-weight:bold", "display:block",
            ].join(";");
            btn.onmouseenter = () => { btn.style.background = "#388e3c"; };
            btn.onmouseleave = () => { btn.style.background = "#2e7d32"; };

            const self = this;
            btn.onclick = (e) => { e.stopPropagation(); openPoseEditorModal(self); };

            this.addDOMWidget("edit_pose_btn", "btn", btn, {
                getValue() { return ""; },
                setValue() {},
                computeSize() { return [0, 42]; },
                serialize: false,
            });

            // Make file widgets visually read-only
            setTimeout(() => {
                for (const w of this.widgets ?? []) {
                    if (["pose_file", "depth_file", "canny_file"].includes(w.name)) {
                        w.disabled = true;
                    }
                }
            }, 100);
        };
    },
});
