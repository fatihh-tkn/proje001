import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/settings/archive/TeknikResimViewer.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=b2ac676d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$(), _s4 = $RefreshSig$(), _s5 = $RefreshSig$(), _s6 = $RefreshSig$(), _s7 = $RefreshSig$(), _s8 = $RefreshSig$(), _s9 = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=b2ac676d"; const React = __vite__cjsImport3_react.__esModule ? __vite__cjsImport3_react.default : __vite__cjsImport3_react; const useState = __vite__cjsImport3_react["useState"]; const useEffect = __vite__cjsImport3_react["useEffect"]; const useCallback = __vite__cjsImport3_react["useCallback"]; const useRef = __vite__cjsImport3_react["useRef"];
import * as XLSX from "/node_modules/.vite/deps/xlsx.js?v=b2ac676d";
import {
  Ruler,
  Search,
  X,
  Loader2,
  Grid,
  List,
  Upload,
  RefreshCw,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ScanLine,
  Layers,
  FileText,
  Table2,
  Cpu,
  Scissors,
  Link2,
  Link2Off,
  FolderOpen,
  ExternalLink,
  Trash2
} from "/node_modules/.vite/deps/lucide-react.js?v=b2ac676d";
import { useErrorStore } from "/src/store/errorStore.js";
const IMAGE_EXTS = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"]);
const isImage = (t) => IMAGE_EXTS.has((t || "").toLowerCase());
function subscribeToDocProgress(docId, filename, onDone) {
  const { addToast, updateToast, replaceToast } = useErrorStore.getState();
  const short = filename.length > 28 ? filename.slice(0, 25) + "â¦" : filename;
  const toastId = addToast({
    type: "loading",
    message: `${short} â iÅleme alÄ±ndÄ±`,
    duration: 0,
    skipDedupe: true
  });
  const es = new EventSource(`/api/archive/progress/${docId}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.done) {
        es.close();
        replaceToast(toastId, { type: "success", message: `${short} â ${data.step}`, duration: 5e3 });
        if (onDone) onDone();
      } else if (data.error) {
        es.close();
        replaceToast(toastId, { type: "error", message: `${short} â ${data.step}`, duration: 7e3 });
        if (onDone) onDone();
      } else {
        updateToast(toastId, { message: `${short} â ${data.step}` });
      }
    } catch {
    }
  };
  es.onerror = () => es.close();
}
function fmtSize(b) {
  if (!b) return null;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(s) {
  return new Date(s).toLocaleDateString("tr", { day: "2-digit", month: "short", year: "numeric" });
}
function ContextMenu({ x, y, item, onDelete, onClose }) {
  _s();
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("contextmenu", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("contextmenu", handler);
    };
  }, [onClose]);
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      ref,
      className: "fixed z-[100] bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden py-1 min-w-[160px]",
      style: { top: y, left: x },
      children: /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => {
            onDelete(item);
            onClose();
          },
          className: "flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors",
          children: [
            /* @__PURE__ */ jsxDEV(Trash2, { size: 13 }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 105,
              columnNumber: 17
            }, this),
            " Sil"
          ]
        },
        void 0,
        true,
        {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 101,
          columnNumber: 13
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 96,
      columnNumber: 5
    },
    this
  );
}
_s(ContextMenu, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = ContextMenu;
function StatusBadge({ item }) {
  const status = item.meta?.transcription_status;
  const va = item.meta?.vision_analysis;
  const imgType = va?.image_type;
  if (status === "processing") return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded border border-amber-200", children: [
    /* @__PURE__ */ jsxDEV(Loader2, { size: 8, className: "animate-spin" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 119,
      columnNumber: 13
    }, this),
    " Ä°ÅLEMDE"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 118,
    columnNumber: 5
  }, this);
  if (imgType === "teknik_resim") return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded border border-emerald-200", children: [
    /* @__PURE__ */ jsxDEV(CheckCircle2, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 124,
      columnNumber: 13
    }, this),
    " TEKNÄ°K RESÄ°M"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 123,
    columnNumber: 5
  }, this);
  if (imgType === "nesting") return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[9px] font-bold rounded border border-orange-200", children: [
    /* @__PURE__ */ jsxDEV(Scissors, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 129,
      columnNumber: 13
    }, this),
    " NESTÄ°NG"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 128,
    columnNumber: 5
  }, this);
  if (va) return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#378ADD]/10 text-[#378ADD] text-[9px] font-bold rounded border border-[#378ADD]/20", children: [
    /* @__PURE__ */ jsxDEV(ScanLine, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 134,
      columnNumber: 13
    }, this),
    " ANALÄ°Z EDÄ°LDÄ°"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 133,
    columnNumber: 5
  }, this);
  if (status === "done") return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 text-stone-500 text-[9px] font-bold rounded border border-stone-200", children: [
    /* @__PURE__ */ jsxDEV(FileText, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 139,
      columnNumber: 13
    }, this),
    " VEKTÃRÄ°ZE"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 138,
    columnNumber: 5
  }, this);
  if (status === "pending") return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-50 text-stone-400 text-[9px] font-bold rounded border border-stone-200", children: [
    /* @__PURE__ */ jsxDEV(Clock, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 144,
      columnNumber: 13
    }, this),
    " BEKLÄ°YOR"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 143,
    columnNumber: 5
  }, this);
  return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-50 text-stone-300 text-[9px] font-bold rounded border border-stone-100", children: [
    /* @__PURE__ */ jsxDEV(AlertTriangle, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 149,
      columnNumber: 13
    }, this),
    " ANALÄ°Z YOK"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 148,
    columnNumber: 5
  }, this);
}
_c2 = StatusBadge;
function CadBadge({ item }) {
  const t = item.meta?.cad_turu;
  if (t === "cad") return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 text-[9px] font-bold rounded border border-violet-200", children: [
    /* @__PURE__ */ jsxDEV(Cpu, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 159,
      columnNumber: 13
    }, this),
    " CAD"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 158,
    columnNumber: 5
  }, this);
  if (t === "nesting") return /* @__PURE__ */ jsxDEV("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-500 text-[9px] font-bold rounded border border-orange-200", children: [
    /* @__PURE__ */ jsxDEV(Scissors, { size: 8 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 164,
      columnNumber: 13
    }, this),
    " NES"
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 163,
    columnNumber: 5
  }, this);
  return null;
}
_c3 = CadBadge;
function FileSlot({ label, color, icon: Icon, file, onFile, inputRef, accept }) {
  const filled = {
    violet: "bg-violet-50 border-violet-300",
    orange: "bg-orange-50 border-orange-300"
  };
  const iconColor = { violet: "text-violet-600", orange: "text-orange-500" };
  return /* @__PURE__ */ jsxDEV("div", { children: [
    /* @__PURE__ */ jsxDEV(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept,
        className: "hidden",
        onChange: (e) => onFile(e.target.files?.[0] || null)
      },
      void 0,
      false,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 180,
        columnNumber: 13
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        onClick: () => inputRef.current?.click(),
        className: `flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all
                    ${file ? filled[color] : "border-stone-200 hover:border-stone-300 bg-stone-50"}`,
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: `p-2.5 rounded-xl shrink-0 ${file ? filled[color].split(" ")[0] : "bg-white border border-stone-200"}`, children: /* @__PURE__ */ jsxDEV(Icon, { size: 16, className: file ? iconColor[color] : "text-stone-400" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 188,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 187,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { className: `text-[12px] font-bold ${file ? iconColor[color] : "text-stone-500"}`, children: label }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 191,
              columnNumber: 21
            }, this),
            file ? /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-500 truncate", children: [
              file.name,
              " Â· ",
              fmtSize(file.size)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 193,
              columnNumber: 11
            }, this) : /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-400", children: "Dosya seÃ§mek iÃ§in tÄ±klayÄ±n" }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 194,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 190,
            columnNumber: 17
          }, this),
          file ? /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: (e) => {
                e.stopPropagation();
                onFile(null);
                if (inputRef.current) inputRef.current.value = "";
              },
              className: "shrink-0 p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors",
              children: /* @__PURE__ */ jsxDEV(X, { size: 13 }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 202,
                columnNumber: 25
              }, this)
            },
            void 0,
            false,
            {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 198,
              columnNumber: 9
            },
            this
          ) : /* @__PURE__ */ jsxDEV(Upload, { size: 14, className: "text-stone-300 shrink-0" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 205,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 182,
        columnNumber: 13
      },
      this
    )
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 179,
    columnNumber: 5
  }, this);
}
_c4 = FileSlot;
function UploadModal({ onClose, onUploaded, onAnalysisDone }) {
  _s2();
  const [cizimFile, setCizimFile] = useState(null);
  const [nestingFile, setNestingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const cizimRef = useRef(null);
  const nestingRef = useRef(null);
  const canUpload = (!!cizimFile || !!nestingFile) && !uploading;
  const handleUpload = async () => {
    if (!canUpload) return;
    setUploading(true);
    try {
      let cizimId = null;
      let nestingId = null;
      if (cizimFile) {
        setProgress("Teknik Ã§izim yÃ¼kleniyorâ¦");
        const fd = new FormData();
        fd.append("file", cizimFile);
        fd.append("kategori", "teknik_resim");
        fd.append("cad_turu", "cad");
        const res = await fetch("/api/archive/direct-upload", { method: "POST", body: fd });
        const data = await res.json();
        cizimId = data.id;
        if (cizimId) subscribeToDocProgress(cizimId, cizimFile.name, onAnalysisDone);
      }
      if (nestingFile) {
        setProgress("Nesting yÃ¼kleniyorâ¦");
        const fd = new FormData();
        fd.append("file", nestingFile);
        fd.append("kategori", "teknik_resim");
        fd.append("cad_turu", "nesting");
        const res = await fetch("/api/archive/direct-upload", { method: "POST", body: fd });
        const data = await res.json();
        nestingId = data.id;
        if (nestingId) subscribeToDocProgress(nestingId, nestingFile.name, onAnalysisDone);
      }
      if (cizimId && nestingId) {
        setProgress("Dosyalar baÄlanÄ±yorâ¦");
        await fetch("/api/archive/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_id: cizimId, target_id: nestingId, link_type: "nesting" })
        });
      }
      onUploaded();
      onClose();
    } catch {
    } finally {
      setUploading(false);
      setProgress("");
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-2xl shadow-2xl border border-stone-200 w-[520px] flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 px-6 py-4 border-b border-stone-100", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "p-2 rounded-xl bg-[#378ADD]/10", children: /* @__PURE__ */ jsxDEV(Upload, { size: 16, className: "text-[#378ADD]" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 274,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 273,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-[14px] font-bold text-stone-800", children: "Teknik Dosya YÃ¼kle" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 277,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-400", children: "Teknik Ã§izim ve/veya nesting planÄ±nÄ± birlikte yÃ¼kleyin" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 278,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 276,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: onClose, disabled: uploading, className: "p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40", children: /* @__PURE__ */ jsxDEV(X, { size: 14 }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 281,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 280,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 272,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "p-6 flex flex-col gap-3", children: [
      /* @__PURE__ */ jsxDEV(
        FileSlot,
        {
          label: "Teknik Ãizim",
          color: "violet",
          icon: Cpu,
          file: cizimFile,
          onFile: setCizimFile,
          inputRef: cizimRef,
          accept: "*"
        },
        void 0,
        false,
        {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 286,
          columnNumber: 21
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        FileSlot,
        {
          label: "Nesting PlanÄ±",
          color: "orange",
          icon: Scissors,
          file: nestingFile,
          onFile: setNestingFile,
          inputRef: nestingRef,
          accept: "*"
        },
        void 0,
        false,
        {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 288,
          columnNumber: 21
        },
        this
      ),
      cizimFile && nestingFile && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-600 font-medium", children: [
        /* @__PURE__ */ jsxDEV(Link2, { size: 12 }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 292,
          columnNumber: 29
        }, this),
        " Ä°ki dosya otomatik olarak birbirine baÄlanacak"
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 291,
        columnNumber: 11
      }, this),
      uploading && progress && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 px-3 py-2 bg-[#378ADD]/5 border border-[#378ADD]/20 rounded-lg text-[11px] text-[#378ADD] font-medium", children: [
        /* @__PURE__ */ jsxDEV(Loader2, { size: 12, className: "animate-spin" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 297,
          columnNumber: 29
        }, this),
        " ",
        progress
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 296,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 285,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-100", children: [
      /* @__PURE__ */ jsxDEV("button", { onClick: onClose, disabled: uploading, className: "px-4 py-2 text-[12px] font-semibold text-stone-500 hover:text-stone-700 disabled:opacity-40", children: "Ä°ptal" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 303,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: handleUpload,
          disabled: !canUpload,
          className: "flex items-center gap-1.5 px-5 py-2 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors disabled:opacity-50",
          children: [
            uploading ? /* @__PURE__ */ jsxDEV(Loader2, { size: 13, className: "animate-spin" }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 311,
              columnNumber: 38
            }, this) : /* @__PURE__ */ jsxDEV(Upload, { size: 13 }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 311,
              columnNumber: 87
            }, this),
            "YÃ¼kle"
          ]
        },
        void 0,
        true,
        {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 306,
          columnNumber: 21
        },
        this
      )
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 302,
      columnNumber: 17
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 271,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 270,
    columnNumber: 5
  }, this);
}
_s2(UploadModal, "D0++EQnlei6IvMa+gfbPXzNji+w=");
_c5 = UploadModal;
function LinkModal({ sourceItem, linkType, onClose, onLinked }) {
  _s3();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const inputRef = useRef(null);
  const isViolet = linkType === "cad";
  const label = isViolet ? "CAD DosyasÄ±" : "Nesting DosyasÄ±";
  const cadTuru = isViolet ? "cad" : "nesting";
  const Icon = isViolet ? Cpu : Scissors;
  const ring = isViolet ? "border-violet-200 bg-violet-50" : "border-orange-200 bg-orange-50";
  const iconCls = isViolet ? "text-violet-400" : "text-orange-400";
  const handleFile = async (file) => {
    if (!file) {
      onClose();
      return;
    }
    setUploading(true);
    setProgress("YÃ¼kleniyorâ¦");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kategori", "teknik_resim");
      fd.append("cad_turu", cadTuru);
      const res = await fetch("/api/archive/direct-upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.id) subscribeToDocProgress(data.id, file.name);
      setProgress("BaÄlanÄ±yorâ¦");
      await fetch("/api/archive/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceItem.id, target_id: data.id, link_type: linkType })
      });
      onLinked();
      onClose();
    } catch {
    } finally {
      setUploading(false);
      setProgress("");
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm", children: /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-2xl shadow-2xl border border-stone-200 w-[380px] flex flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: "*",
        className: "hidden",
        onChange: (e) => handleFile(e.target.files?.[0] || null)
      },
      void 0,
      false,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 361,
        columnNumber: 17
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 px-5 py-4 border-b border-stone-100", children: [
      /* @__PURE__ */ jsxDEV("div", { className: `p-2 rounded-xl ${isViolet ? "bg-violet-50" : "bg-orange-50"}`, children: /* @__PURE__ */ jsxDEV(Icon, { size: 16, className: iconCls }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 367,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 366,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-[13px] font-bold text-stone-800", children: [
          label,
          " BaÄla"
        ] }, void 0, true, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 370,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-400 truncate", children: [
          "â ",
          sourceItem.filename
        ] }, void 0, true, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 371,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 369,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("button", { onClick: onClose, disabled: uploading, className: "p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40", children: /* @__PURE__ */ jsxDEV(X, { size: 14 }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 374,
        columnNumber: 25
      }, this) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 373,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 365,
      columnNumber: 17
    }, this),
    uploading ? /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center gap-3 py-10 text-[12px] text-stone-500", children: [
      /* @__PURE__ */ jsxDEV(Loader2, { size: 18, className: "animate-spin text-[#378ADD]" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 381,
        columnNumber: 25
      }, this),
      progress
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 380,
      columnNumber: 9
    }, this) : /* @__PURE__ */ jsxDEV(
      "div",
      {
        onClick: () => inputRef.current?.click(),
        className: "flex flex-col items-center justify-center gap-3 py-8 px-6 cursor-pointer hover:bg-stone-50 transition-colors",
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: `p-4 rounded-2xl border-2 border-dashed ${ring}`, children: /* @__PURE__ */ jsxDEV(Upload, { size: 26, className: iconCls }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 390,
            columnNumber: 29
          }, this) }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 389,
            columnNumber: 25
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] font-bold text-stone-700", children: "Dosya seÃ§mek iÃ§in tÄ±klayÄ±n" }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 393,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-400 mt-0.5", children: "PNG, JPG, PDF, DWG, DXF, STP/STEP desteklenir" }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 394,
              columnNumber: 29
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 392,
            columnNumber: 25
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 385,
        columnNumber: 9
      },
      this
    )
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 360,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 359,
    columnNumber: 5
  }, this);
}
_s3(LinkModal, "dFVOUvA5kxGTG2qCz8DljwImfyA=");
_c6 = LinkModal;
function LinkStatus({ item, onUnlink, onStartLink }) {
  const bagli = item.meta?.bagli_dosyalar || {};
  const cadId = bagli.cad;
  const nestingId = bagli.nesting;
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "group/badge relative flex items-center", children: cadId ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-violet-100 text-violet-700 border border-violet-300", children: [
        /* @__PURE__ */ jsxDEV(Cpu, { size: 7 }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 416,
          columnNumber: 29
        }, this),
        " CAD ",
        /* @__PURE__ */ jsxDEV(CheckCircle2, { size: 7, className: "text-violet-500" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 416,
          columnNumber: 50
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 415,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onUnlink(item.id, "cad");
          },
          title: "BaÄlantÄ±yÄ± kaldÄ±r",
          className: "absolute -top-1.5 -right-1.5 hidden group-hover/badge:flex w-3.5 h-3.5 items-center justify-center bg-red-500 text-white rounded-full shadow",
          children: /* @__PURE__ */ jsxDEV(X, { size: 6 }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 423,
            columnNumber: 29
          }, this)
        },
        void 0,
        false,
        {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 418,
          columnNumber: 25
        },
        this
      )
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 414,
      columnNumber: 9
    }, this) : /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onStartLink(item, "cad");
        },
        title: "CAD dosyasÄ± baÄla",
        className: "flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-50 text-stone-300 border border-dashed border-stone-200 hover:border-violet-300 hover:text-violet-400 hover:bg-violet-50 transition-colors",
        children: [
          /* @__PURE__ */ jsxDEV(Cpu, { size: 7 }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 432,
            columnNumber: 25
          }, this),
          " CAD"
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 427,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 412,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "group/badge relative flex items-center", children: nestingId ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-orange-100 text-orange-600 border border-orange-300", children: [
        /* @__PURE__ */ jsxDEV(Scissors, { size: 7 }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 442,
          columnNumber: 29
        }, this),
        " NES ",
        /* @__PURE__ */ jsxDEV(CheckCircle2, { size: 7, className: "text-orange-500" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 442,
          columnNumber: 55
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 441,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onUnlink(item.id, "nesting");
          },
          title: "BaÄlantÄ±yÄ± kaldÄ±r",
          className: "absolute -top-1.5 -right-1.5 hidden group-hover/badge:flex w-3.5 h-3.5 items-center justify-center bg-red-500 text-white rounded-full shadow",
          children: /* @__PURE__ */ jsxDEV(X, { size: 6 }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 449,
            columnNumber: 29
          }, this)
        },
        void 0,
        false,
        {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 444,
          columnNumber: 25
        },
        this
      )
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 440,
      columnNumber: 9
    }, this) : /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onStartLink(item, "nesting");
        },
        title: "Nesting dosyasÄ± baÄla",
        className: "flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-50 text-stone-300 border border-dashed border-stone-200 hover:border-orange-300 hover:text-orange-400 hover:bg-orange-50 transition-colors",
        children: [
          /* @__PURE__ */ jsxDEV(Scissors, { size: 7 }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 458,
            columnNumber: 25
          }, this),
          " NES"
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 453,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 438,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 410,
    columnNumber: 5
  }, this);
}
_c7 = LinkStatus;
function _setColWidths(ws, widths) {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}
function _buildTeknikSheet(va) {
  const bb = va?.baslik_bloku || {};
  const rows = [];
  rows.push(["BAÅLIK BLOÄU", ""]);
  [
    ["Ãizim No", bb.cizim_numarasi],
    ["Kimlik No", bb.kimlik_numarasi],
    ["BaÅlÄ±k", bb.baslik],
    ["Firma", bb.firma],
    ["Proje", bb.proje],
    ["Revizyon", bb.revizyon],
    ["ÃlÃ§ek", bb.olcek],
    ["Tarih", bb.tarih],
    ["Ãizen", bb.cizen],
    ["Onaylayan", bb.onaylayan],
    ["Kontrol Eden", bb.kontrol_eden],
    ["Malzeme", bb.malzeme],
    ["YÃ¼zey Ä°Ålemi", bb.yuzey_islem],
    ["Sertlik", bb.sertlik],
    ["AÄÄ±rlÄ±k", bb.agirlik],
    ["Birim", bb.birim],
    ["Format", bb.blatt_format],
    ["Sayfa", bb.sayfa]
  ].forEach(([k, v]) => {
    if (v) rows.push([k, String(v)]);
  });
  rows.push([]);
  rows.push(["PARÃA LÄ°STESÄ°", "", "", "", "", ""]);
  rows.push(["Poz", "Adet", "Ãizim No", "Malzeme", "YarÄ± Mamul", "AÃ§Ä±klama"]);
  (va?.parca_listesi || []).forEach((p) => rows.push(
    [
      p.poz || "",
      p.adet || "",
      p.cizim_no || "",
      p.malzeme || "",
      p.yarim_mamul || "",
      p.aciklama || ""
    ]
  ));
  if (va?.olcular?.length) {
    rows.push([]);
    rows.push(["ÃLÃÃLER", "", "", "", ""]);
    if (typeof va.olcular[0] === "object") {
      rows.push(["Etiket", "DeÄer", "Birim", "Tolerans", "AÃ§Ä±klama"]);
      va.olcular.forEach((o) => rows.push(
        [
          o.etiket || "",
          o.deger || "",
          o.birim || "mm",
          o.tolerans || "",
          o.aciklama || ""
        ]
      ));
    } else {
      rows.push(["ÃlÃ§Ã¼"]);
      va.olcular.forEach((o) => rows.push([String(o)]));
    }
  }
  if (va?.toleranslar?.length) {
    rows.push([]);
    rows.push(["TOLERANSLAR", "", ""]);
    if (typeof va.toleranslar[0] === "object") {
      rows.push(["Tip", "DeÄer", "AÃ§Ä±klama"]);
      va.toleranslar.forEach((t) => rows.push([t.tip || "", t.deger || "", t.aciklama || ""]));
    } else {
      rows.push(["Tolerans"]);
      va.toleranslar.forEach((t) => rows.push([String(t)]));
    }
  }
  if (va?.islem_sirasi?.length) {
    rows.push([]);
    rows.push(["Ä°ÅLEM SIRASI", "", ""]);
    if (typeof va.islem_sirasi[0] === "object") {
      rows.push(["SÄ±ra", "Ä°Ålem", "AÃ§Ä±klama"]);
      va.islem_sirasi.forEach((s) => rows.push([s.sira || "", s.islem || "", s.aciklama || ""]));
    } else {
      rows.push(["SÄ±ra", "Ä°Ålem"]);
      va.islem_sirasi.forEach((s, i) => rows.push([i + 1, String(s)]));
    }
  }
  if (va?.notlar?.length) {
    rows.push([]);
    rows.push(["NOTLAR"]);
    va.notlar.forEach((n) => rows.push([String(n)]));
  }
  if (va?.genel_metin) {
    rows.push([]);
    rows.push(["GENEL METÄ°N", String(va.genel_metin)]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  _setColWidths(ws, [22, 40, 18, 18, 22, 40]);
  return ws;
}
function _buildNestingSheet(va) {
  const rows = [];
  rows.push(["GENEL BÄ°LGÄ°LER", ""]);
  [
    ["Program AdÄ±", va?.program_adi],
    ["Malzeme No", va?.malzeme_numarasi],
    ["Malzeme", va?.malzeme],
    ["KalÄ±nlÄ±k", va?.kalinlik],
    ["Levha Boyutu", va?.levha_boyutu],
    ["Toplam ParÃ§a", va?.toplam_parca_adedi],
    ["KullanÄ±m OranÄ±", va?.kullanim_orani],
    ["Fire OranÄ±", va?.fire_orani]
  ].forEach(([k, v]) => {
    if (v) rows.push([k, String(v)]);
  });
  if (va?.islemler?.length) {
    rows.push([]);
    rows.push(["YAPILACAK Ä°ÅLEMLER"]);
    va.islemler.forEach((i) => rows.push([String(i)]));
  }
  rows.push([]);
  rows.push(["PARÃA LÄ°STESÄ°", "", "", ""]);
  rows.push(["ParÃ§a AdÄ±", "Adet", "Malzeme", "KalÄ±nlÄ±k"]);
  (va?.parca_listesi || []).forEach((p) => rows.push(
    [
      p.parca_adi || "",
      p.adet || "",
      p.malzeme || "",
      p.kalinlik || ""
    ]
  ));
  if (va?.notlar?.length) {
    rows.push([]);
    rows.push(["NOTLAR"]);
    va.notlar.forEach((n) => rows.push([String(n)]));
  }
  if (va?.genel_metin) {
    rows.push([]);
    rows.push(["GENEL METÄ°N", String(va.genel_metin)]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  _setColWidths(ws, [28, 12, 20, 12]);
  return ws;
}
function downloadExcel(item, linkedItem) {
  const wb = XLSX.utils.book_new();
  const va = item.meta?.vision_analysis;
  const lva = linkedItem?.meta?.vision_analysis;
  if (va?.image_type === "teknik_resim") {
    XLSX.utils.book_append_sheet(wb, _buildTeknikSheet(va), "Teknik Resim");
    if (lva?.image_type === "nesting")
      XLSX.utils.book_append_sheet(wb, _buildNestingSheet(lva), "Nesting");
  } else if (va?.image_type === "nesting") {
    XLSX.utils.book_append_sheet(wb, _buildNestingSheet(va), "Nesting");
    if (lva?.image_type === "teknik_resim")
      XLSX.utils.book_append_sheet(wb, _buildTeknikSheet(lva), "Teknik Resim");
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Analiz verisi yok"]]), "Veri");
  }
  const name = item.filename.replace(/\.[^.]+$/, "") + "_analiz.xlsx";
  XLSX.writeFile(wb, name);
}
function DataTableModal({ item, allItems, onClose }) {
  _s4();
  const va = item.meta?.vision_analysis;
  const bagli = item.meta?.bagli_dosyalar || {};
  const linkedId = bagli.nesting || bagli.cad || bagli.cizim;
  const linkedItem = linkedId ? (allItems || []).find((i) => i.id === linkedId) : null;
  const lva = linkedItem?.meta?.vision_analysis;
  const initTab = va?.image_type === "nesting" ? "nesting" : "teknik";
  const [tab, setTab] = useState(initTab);
  const hasTeknik = va?.image_type === "teknik_resim" || lva?.image_type === "teknik_resim";
  const hasNesting = va?.image_type === "nesting" || lva?.image_type === "nesting";
  const activeVa = tab === "teknik" ? va?.image_type === "teknik_resim" ? va : lva : va?.image_type === "nesting" ? va : lva;
  const hasAny = hasTeknik || hasNesting;
  return /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6", children: /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: "bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden",
      style: { width: "860px", height: "88vh" },
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 px-6 py-4 border-b border-stone-100 shrink-0", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "p-2 rounded-xl bg-[#378ADD]/10", children: /* @__PURE__ */ jsxDEV(Table2, { size: 15, className: "text-[#378ADD]" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 653,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 652,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-[13px] font-bold text-stone-800 truncate", children: item.filename }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 656,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-stone-400", children: "YapÄ±sal analiz verisi" }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 657,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 655,
            columnNumber: 21
          }, this),
          hasTeknik && hasNesting && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center bg-stone-100 rounded-xl p-0.5 gap-0.5", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setTab("teknik"),
                className: `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                    ${tab === "teknik" ? "bg-white shadow text-violet-600" : "text-stone-400 hover:text-stone-600"}`,
                children: [
                  /* @__PURE__ */ jsxDEV(Cpu, { size: 11 }, void 0, false, {
                    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                    lineNumber: 668,
                    columnNumber: 33
                  }, this),
                  " Teknik Ãizim"
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 663,
                columnNumber: 29
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setTab("nesting"),
                className: `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                    ${tab === "nesting" ? "bg-white shadow text-orange-500" : "text-stone-400 hover:text-stone-600"}`,
                children: [
                  /* @__PURE__ */ jsxDEV(Scissors, { size: 11 }, void 0, false, {
                    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                    lineNumber: 675,
                    columnNumber: 33
                  }, this),
                  " Nesting"
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 670,
                columnNumber: 29
              },
              this
            )
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 662,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ jsxDEV("button", { onClick: onClose, className: "p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors ml-1", children: /* @__PURE__ */ jsxDEV(X, { size: 15 }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 681,
            columnNumber: 25
          }, this) }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 680,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 651,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-hidden flex flex-col min-h-0", children: !hasAny ? /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto minimal-scroll", children: /* @__PURE__ */ jsxDEV(EmptyAnalysisState, { status: item.meta?.transcription_status, va, visionError: item.meta?.vision_error }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 689,
          columnNumber: 29
        }, this) }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 688,
          columnNumber: 11
        }, this) : tab === "teknik" ? /* @__PURE__ */ jsxDEV(TeknikTable, { va: activeVa }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 692,
          columnNumber: 11
        }, this) : /* @__PURE__ */ jsxDEV(NestingTable, { va: activeVa }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 694,
          columnNumber: 11
        }, this) }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 686,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between gap-3 px-6 py-3.5 border-t border-stone-100 shrink-0", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => downloadExcel(item, linkedItem),
              disabled: !hasAny,
              className: "flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-[12px] font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40",
              children: [
                /* @__PURE__ */ jsxDEV(Download, { size: 13 }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 705,
                  columnNumber: 25
                }, this),
                " Excel Ä°ndir"
              ]
            },
            void 0,
            true,
            {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 700,
              columnNumber: 21
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("button", { onClick: onClose, className: "px-4 py-2 text-[12px] font-semibold text-stone-500 hover:text-stone-700", children: "Kapat" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 707,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 699,
          columnNumber: 17
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 647,
      columnNumber: 13
    },
    this
  ) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 646,
    columnNumber: 5
  }, this);
}
_s4(DataTableModal, "mwxstgQJPjeGmVvL40NEnMdEnxk=");
_c8 = DataTableModal;
function EmptyAnalysisState({ status, va, visionError }) {
  _s5();
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    if (status === "done" && !va) {
      fetch("/api/archive/check-vision-config").then((r) => r.json()).then(setCfg).catch(() => {
      });
    }
  }, [status, va]);
  if (status === "processing") return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-48 gap-3 text-[#378ADD]", children: [
    /* @__PURE__ */ jsxDEV(Loader2, { size: 30, strokeWidth: 1.5, className: "animate-spin" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 731,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] font-semibold", children: "Vision AI analiz ediyorâ¦" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 732,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 730,
    columnNumber: 5
  }, this);
  if (status === "done" && !va) {
    const dp = cfg?.doc_processing;
    const vf = cfg?.vision_fallback;
    return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4 px-8 py-8", children: [
      /* @__PURE__ */ jsxDEV(AlertTriangle, { size: 28, strokeWidth: 1.5, className: "text-amber-400 shrink-0" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 741,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] font-bold text-stone-700", children: "Vision analizi tamamlanamadÄ±" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 743,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-400 mt-1", children: "GÃ¶rsel yapay zekaya gÃ¶nderildi ancak yanÄ±t alÄ±namadÄ±." }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 744,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 742,
        columnNumber: 17
      }, this),
      visionError && /* @__PURE__ */ jsxDEV("div", { className: "w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[11px]", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "font-bold text-red-600 mb-1", children: "API HatasÄ±" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 750,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-red-500 break-all font-mono", children: visionError }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 751,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 749,
        columnNumber: 9
      }, this),
      cfg && /* @__PURE__ */ jsxDEV("div", { className: "w-full bg-stone-50 rounded-xl border border-stone-200 overflow-hidden text-[11px]", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2 border-b border-stone-200 text-[10px] font-black tracking-widest text-stone-400 uppercase", children: "Model TanÄ±lamasÄ±" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 757,
          columnNumber: 25
        }, this),
        [
          { label: "Teknik DÃ¶kÃ¼man Ä°Åleme", info: dp },
          { label: "Vision Fallback", info: vf }
        ].map(
          ({ label, info }) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-start gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0", children: [
            /* @__PURE__ */ jsxDEV("span", { className: `mt-0.5 w-2 h-2 rounded-full shrink-0 ${info?.found && info?.has_key && info?.model_id ? "bg-emerald-400" : "bg-red-400"}` }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 765,
              columnNumber: 33
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "font-semibold text-stone-600", children: label }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 767,
                columnNumber: 37
              }, this),
              !info?.stored && /* @__PURE__ */ jsxDEV("p", { className: "text-stone-400", children: "AyarlanmamÄ±Å" }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 768,
                columnNumber: 55
              }, this),
              info?.stored && !info?.found && /* @__PURE__ */ jsxDEV("p", { className: "text-red-500", children: "Model bulunamadÄ± (ID geÃ§ersiz)" }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 769,
                columnNumber: 70
              }, this),
              info?.found && !info?.has_key && /* @__PURE__ */ jsxDEV("p", { className: "text-red-500", children: "API anahtarÄ± eksik veya Ã§Ã¶zÃ¼lemiyor" }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 770,
                columnNumber: 71
              }, this),
              info?.found && info?.has_key && !info?.model_id && /* @__PURE__ */ jsxDEV("p", { className: "text-amber-500", children: "Model adÄ± boÅ (model_id alanÄ± dolu deÄil)" }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 771,
                columnNumber: 89
              }, this),
              info?.found && info?.has_key && info?.model_id && /* @__PURE__ */ jsxDEV("p", { className: "text-emerald-600", children: [
                info.model_id,
                " Â· ",
                info.provider || "gemini"
              ] }, void 0, true, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 773,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 766,
              columnNumber: 33
            }, this)
          ] }, label, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 764,
            columnNumber: 11
          }, this)
        )
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 756,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] text-stone-400 text-center", children: 'Sorunu giderdikten sonra "Analiz Et" ile tekrar deneyin.' }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 780,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 740,
      columnNumber: 7
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-48 gap-3 text-stone-400", children: [
    /* @__PURE__ */ jsxDEV(Table2, { size: 32, strokeWidth: 1 }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 789,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] font-medium", children: 'HenÃ¼z analiz edilmemiÅ â Ã¶nce "Analiz Et" butonuna basÄ±n' }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 790,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 788,
    columnNumber: 5
  }, this);
}
_s5(EmptyAnalysisState, "RAqz24GSmg4W7JhWlLtb03HDGfY=");
_c9 = EmptyAnalysisState;
function GenericSection({ label, value }) {
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "object" && first !== null) {
      const cols = Object.keys(first).map((k) => ({ key: k, label: k, w: `${Math.floor(100 / Object.keys(first).length)}%` }));
      return /* @__PURE__ */ jsxDEV(SheetBlock, { title: label, color: "blue", children: /* @__PURE__ */ jsxDEV(SheetDataTable, { cols, rows: value }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 803,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 802,
        columnNumber: 9
      }, this);
    }
    return /* @__PURE__ */ jsxDEV(SheetBlock, { title: label, color: "stone", children: /* @__PURE__ */ jsxDEV(SheetTagTable, { items: value }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 809,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 808,
      columnNumber: 7
    }, this);
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const rows = Object.entries(value).filter(([, v]) => v).map(([k, v]) => [k, String(v)]);
    if (rows.length === 0) return null;
    return /* @__PURE__ */ jsxDEV(SheetBlock, { title: label, color: "blue", children: /* @__PURE__ */ jsxDEV(SheetKVTable, { rows }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 818,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 817,
      columnNumber: 7
    }, this);
  }
  if (value && typeof value === "string") {
    return /* @__PURE__ */ jsxDEV(SheetBlock, { title: label, color: "stone", children: /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] text-stone-600 leading-relaxed px-4 py-3", children: value }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 825,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 824,
      columnNumber: 7
    }, this);
  }
  return null;
}
_c0 = GenericSection;
function ExcelSheet({ rows, cols }) {
  if (!rows || rows.length === 0) return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center h-24 text-stone-400 text-[12px]", children: "Veri yok" }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 837,
    columnNumber: 5
  }, this);
  const isKV = Array.isArray(rows[0]);
  if (isKV) {
    return /* @__PURE__ */ jsxDEV("table", { className: "w-full border-collapse text-[12px]", children: [
      /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { className: "bg-[#217346]/10", children: [
        /* @__PURE__ */ jsxDEV("th", { className: "w-8 border border-stone-200 bg-stone-100 text-stone-400 text-[10px] font-normal px-2 py-1.5 text-center" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 847,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]", children: "Alan" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 848,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]", children: "DeÄer" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 849,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 846,
        columnNumber: 21
      }, this) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 845,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("tbody", { children: rows.map(
        ([label, val], i) => /* @__PURE__ */ jsxDEV("tr", { className: i % 2 === 0 ? "bg-white" : "bg-stone-50/60", children: [
          /* @__PURE__ */ jsxDEV("td", { className: "border border-stone-200 bg-stone-100 text-stone-400 text-[10px] px-2 py-1.5 text-center w-8", children: i + 1 }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 855,
            columnNumber: 29
          }, this),
          /* @__PURE__ */ jsxDEV("td", { className: "border border-stone-200 px-3 py-1.5 text-stone-500 font-medium", children: label }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 856,
            columnNumber: 29
          }, this),
          /* @__PURE__ */ jsxDEV("td", { className: "border border-stone-200 px-3 py-1.5 text-stone-800", children: val }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 857,
            columnNumber: 29
          }, this)
        ] }, i, true, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 854,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 852,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 844,
      columnNumber: 7
    }, this);
  }
  const headers = cols || Object.keys(rows[0]);
  return /* @__PURE__ */ jsxDEV("table", { className: "w-full border-collapse text-[12px]", children: [
    /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
      /* @__PURE__ */ jsxDEV("th", { className: "w-8 border border-stone-200 bg-stone-100 text-stone-400 text-[10px] font-normal px-2 py-1.5 text-center" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 871,
        columnNumber: 21
      }, this),
      headers.map(
        (h) => /* @__PURE__ */ jsxDEV("th", { className: "border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]", children: h }, h, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 873,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 870,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 869,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("tbody", { children: rows.map(
      (row, i) => /* @__PURE__ */ jsxDEV("tr", { className: i % 2 === 0 ? "bg-white" : "bg-stone-50/60", children: [
        /* @__PURE__ */ jsxDEV("td", { className: "border border-stone-200 bg-stone-100 text-stone-400 text-[10px] px-2 py-1.5 text-center", children: i + 1 }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 880,
          columnNumber: 25
        }, this),
        headers.map(
          (h) => /* @__PURE__ */ jsxDEV("td", { className: "border border-stone-200 px-3 py-1.5 text-stone-800", children: row[h] ?? "" }, h, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 882,
            columnNumber: 11
          }, this)
        )
      ] }, i, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 879,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 877,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 868,
    columnNumber: 5
  }, this);
}
_c1 = ExcelSheet;
function TeknikTable({ va }) {
  _s6();
  const llmSkipped = va?.llm_skipped === true;
  const SECTION_LABELS = {
    baslik_bloku: "BaÅlÄ±k BloÄu",
    parca_listesi: "ParÃ§a Listesi",
    olcular: "ÃlÃ§Ã¼ler",
    toleranslar: "Toleranslar",
    notlar: "Notlar",
    yuzey_islemleri: "YÃ¼zey Ä°Ålemleri",
    kesitler: "Kesitler",
    islem_sirasi: "Ä°Ålem SÄ±rasÄ±",
    parca_tanim: "ParÃ§a TanÄ±mÄ±",
    geometrik: "Geometrik Bilgiler",
    malzeme_uretim: "Malzeme & Ãretim",
    izlenebilirlik: "Ä°zlenebilirlik",
    genel_metin: "Genel Metin"
  };
  const FIELD_LABELS = {
    cizim_numarasi: "Ãizim No",
    baslik: "BaÅlÄ±k",
    firma: "Firma",
    proje: "Proje",
    revizyon: "Revizyon",
    olcek: "ÃlÃ§ek",
    tarih: "Tarih",
    cizen: "Ãizen",
    onaylayan: "Onaylayan",
    kontrol_eden: "Kontrol Eden",
    malzeme: "Malzeme",
    yuzey_islem: "YÃ¼zey Ä°Ålemi",
    sertlik: "Sertlik",
    agirlik: "AÄÄ±rlÄ±k",
    birim: "Birim",
    sayfa: "Sayfa",
    blatt_format: "Format",
    parca_adi: "ParÃ§a AdÄ±",
    parca_kodu: "ParÃ§a Kodu",
    kimlik_numarasi: "Kimlik No",
    sayfa_bilgisi: "Sayfa Bilgisi",
    cizim_no: "Ãizim No",
    yarim_mamul: "YarÄ± Mamul",
    acilim_uzunlugu: "AÃ§Ä±lÄ±m UzunluÄu",
    boyutlar: "Boyutlar",
    bukme_yaricapi: "BÃ¼kme YarÄ±Ã§apÄ±",
    kenar_mesafeleri: "Kenar Mesafeleri",
    kesit: "Kesit",
    yuzey_standardi: "YÃ¼zey StandardÄ±",
    kesim_standardi: "Kesim StandardÄ±",
    sayfa_formati: "Sayfa FormatÄ±",
    talasli_tolerans: "TalaÅlÄ± Tolerans",
    talassiz_tolerans: "TalaÅsÄ±z Tolerans",
    kaynakli_tolerans: "KaynaklÄ± Tolerans",
    dokum_tolerans: "DÃ¶kÃ¼m Tolerans",
    cizim_tarihi: "Ãizim Tarihi",
    kalite_kontrol: "Kalite Kontrol",
    cad_bilgisi: "CAD Bilgisi",
    poz: "Poz",
    adet: "Adet",
    aciklama: "AÃ§Ä±klama",
    // ÃlÃ§Ã¼ler (yeni Åema)
    etiket: "Etiket",
    deger: "DeÄer",
    tolerans: "Tolerans",
    // Toleranslar (yeni Åema)
    tip: "Tip",
    // Ä°Ålem sÄ±rasÄ± (yeni Åema)
    sira: "SÄ±ra",
    islem: "Ä°Ålem"
  };
  const SKIP = /* @__PURE__ */ new Set(["image_type", "kaynak", "projeksiyon_acisi", "llm_skipped"]);
  const sections = [];
  for (const [key, val] of Object.entries(va || {})) {
    if (SKIP.has(key) || !val) continue;
    const title = SECTION_LABELS[key] || key;
    if (key === "baslik_bloku" && typeof val === "object" && !Array.isArray(val)) {
      const rows = Object.entries(val).filter(([, v]) => v).map(([k, v]) => [FIELD_LABELS[k] || k, String(v)]);
      if (rows.length) sections.push({ key, title, type: "kv", rows });
    } else if (Array.isArray(val) && val.length > 0) {
      if (typeof val[0] === "object") {
        const rawCols = Object.keys(val[0]);
        const cols = rawCols.map((c) => FIELD_LABELS[c] || c);
        const rows = val.map((r) => {
          const out = {};
          rawCols.forEach((c, i) => {
            out[cols[i]] = r[c] ?? "";
          });
          return out;
        });
        sections.push({ key, title, type: "table", rows, cols });
      } else {
        const rows = val.map((v, i) => [String(i + 1), String(v)]);
        sections.push({ key, title, type: "kv", rows });
      }
    } else if (typeof val === "object" && !Array.isArray(val)) {
      const rows = Object.entries(val).filter(([, v]) => v).map(([k, v]) => [FIELD_LABELS[k] || k, String(v)]);
      if (rows.length) sections.push({ key, title, type: "kv", rows });
    } else if (typeof val === "string" && val.trim()) {
      sections.push({ key, title, type: "text", text: val });
    }
  }
  const [activeKey, setActiveKey] = useState(() => sections[0]?.key || "");
  const active = sections.find((s) => s.key === activeKey) || sections[0];
  if (!sections.length) return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center h-32 text-stone-400 text-[12px]", children: "Teknik Ã§izim analizi bulunamadÄ±" }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 977,
    columnNumber: 5
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col h-full", children: [
    llmSkipped && /* @__PURE__ */ jsxDEV("div", { className: "shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-700", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "font-bold", children: "LLM'den devam edilmedi" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 987,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "text-amber-500", children: "â YalnÄ±zca DXF metin entity'leri gÃ¶steriliyor. DetaylÄ± analiz iÃ§in LLM'i etkinleÅtirebilirsiniz." }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 988,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 986,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex items-end gap-0 bg-[#f0f0f0] border-b border-stone-300 px-3 pt-2 overflow-x-auto shrink-0", children: sections.map(
      (s) => /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setActiveKey(s.key),
          className: `flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold whitespace-nowrap border border-b-0 rounded-t-md mr-0.5 transition-all ${active?.key === s.key ? "bg-white border-stone-300 text-[#217346] shadow-sm -mb-px z-10 relative" : "bg-[#dce6d0] border-[#dce6d0] text-stone-500 hover:bg-[#c9d9ba] hover:text-stone-700"}`,
          children: s.title
        },
        s.key,
        false,
        {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 994,
          columnNumber: 9
        },
        this
      )
    ) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 992,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-auto bg-white", children: active?.type === "text" ? /* @__PURE__ */ jsxDEV("div", { className: "p-5 text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap", children: active.text }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1011,
      columnNumber: 9
    }, this) : /* @__PURE__ */ jsxDEV(ExcelSheet, { rows: active?.rows, cols: active?.cols }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1013,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1009,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 983,
    columnNumber: 5
  }, this);
}
_s6(TeknikTable, "huCPvHqgYKXzrWmbRSkOeDYPeMc=");
_c10 = TeknikTable;
function NestingTable({ va }) {
  if (!va) return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center h-32 text-stone-400 text-[12px]", children: "Nesting analizi bulunamadÄ±" }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1023,
    columnNumber: 5
  }, this);
  const genelRows = [
    ["Program", va.program_adi],
    ["Malzeme No", va.malzeme_numarasi],
    ["Malzeme", va.malzeme],
    ["KalÄ±nlÄ±k", va.kalinlik],
    ["Levha Boyutu", va.levha_boyutu],
    ["Toplam ParÃ§a", va.toplam_parca_adedi],
    ["KullanÄ±m OranÄ±", va.kullanim_orani],
    ["Fire OranÄ±", va.fire_orani]
  ].filter(([, v]) => v);
  return /* @__PURE__ */ jsxDEV("div", { className: "p-6 flex flex-col gap-6", children: [
    genelRows.length > 0 && /* @__PURE__ */ jsxDEV(SheetBlock, { title: "Genel Bilgiler", color: "orange", icon: Cpu, children: /* @__PURE__ */ jsxDEV(SheetKVTable, { rows: genelRows, highlightKeys: ["KullanÄ±m OranÄ±", "Fire OranÄ±"] }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1043,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1042,
      columnNumber: 7
    }, this),
    va.islemler?.length > 0 && /* @__PURE__ */ jsxDEV(SheetBlock, { title: "YapÄ±lacak Ä°Ålemler", color: "violet", children: /* @__PURE__ */ jsxDEV(SheetTagTable, { items: va.islemler }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1049,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1048,
      columnNumber: 7
    }, this),
    va.parca_listesi?.length > 0 && /* @__PURE__ */ jsxDEV(SheetBlock, { title: "ParÃ§a Listesi", color: "orange", icon: Layers, children: /* @__PURE__ */ jsxDEV(
      SheetDataTable,
      {
        cols: [
          { key: "parca_adi", label: "ParÃ§a AdÄ±", w: "50%" },
          { key: "adet", label: "Adet", w: "15%" },
          { key: "malzeme", label: "Malzeme", w: "35%" }
        ],
        rows: va.parca_listesi
      },
      void 0,
      false,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1055,
        columnNumber: 21
      },
      this
    ) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1054,
      columnNumber: 7
    }, this),
    va.notlar?.length > 0 && /* @__PURE__ */ jsxDEV(SheetBlock, { title: "Notlar", color: "stone", children: /* @__PURE__ */ jsxDEV(SheetNoteTable, { items: va.notlar }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1068,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1067,
      columnNumber: 7
    }, this),
    va.genel_metin && /* @__PURE__ */ jsxDEV(SheetBlock, { title: "Genel Metin", color: "stone", children: /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] text-stone-600 leading-relaxed px-1", children: va.genel_metin }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1074,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1073,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1040,
    columnNumber: 5
  }, this);
}
_c11 = NestingTable;
function SheetBlock({ title, icon: Icon, color = "stone", children }) {
  const hdr = {
    blue: "bg-[#378ADD]/8 text-[#378ADD] border-[#378ADD]/20",
    violet: "bg-violet-50 text-violet-600 border-violet-200",
    orange: "bg-orange-50 text-orange-500 border-orange-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    stone: "bg-stone-50 text-stone-500 border-stone-200"
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "rounded-xl border border-stone-200 overflow-hidden", children: [
    /* @__PURE__ */ jsxDEV("div", { className: `flex items-center gap-2 px-4 py-2 border-b ${hdr[color]}`, children: [
      Icon && /* @__PURE__ */ jsxDEV(Icon, { size: 12 }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1093,
        columnNumber: 26
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-black tracking-widest uppercase", children: title }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1094,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1092,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "bg-white", children }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1096,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1091,
    columnNumber: 5
  }, this);
}
_c12 = SheetBlock;
function SheetKVTable({ rows, highlightKeys = [] }) {
  return /* @__PURE__ */ jsxDEV("table", { className: "w-full text-[12px]", children: /* @__PURE__ */ jsxDEV("tbody", { children: rows.map(([k, v], i) => {
    const hi = highlightKeys.includes(k);
    return /* @__PURE__ */ jsxDEV("tr", { className: i % 2 === 0 ? "bg-white" : "bg-stone-50/60", children: [
      /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-2 w-36 font-semibold text-stone-400 border-r border-stone-100 whitespace-nowrap", children: k }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1109,
        columnNumber: 29
      }, this),
      /* @__PURE__ */ jsxDEV("td", { className: `px-4 py-2 font-medium ${hi ? "text-emerald-600 font-bold" : "text-stone-700"}`, children: v }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1110,
        columnNumber: 29
      }, this)
    ] }, i, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1108,
      columnNumber: 13
    }, this);
  }) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1104,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1103,
    columnNumber: 5
  }, this);
}
_c13 = SheetKVTable;
function SheetDataTable({ cols, rows }) {
  return /* @__PURE__ */ jsxDEV("table", { className: "w-full text-[12px]", children: [
    /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { className: "bg-stone-50 border-b border-stone-100", children: cols.map(
      (c) => /* @__PURE__ */ jsxDEV("th", { className: "px-4 py-2 text-left text-[10px] font-black text-stone-400 uppercase tracking-wider", style: { width: c.w }, children: c.label }, c.key, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1125,
        columnNumber: 11
      }, this)
    ) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1123,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1122,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("tbody", { children: rows.map(
      (r, i) => /* @__PURE__ */ jsxDEV("tr", { className: `border-b border-stone-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-stone-50/40"}`, children: cols.map(
        (c) => /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-2 text-stone-700 font-medium", children: r[c.key] || "â" }, c.key, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 1135,
          columnNumber: 11
        }, this)
      ) }, i, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1133,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1131,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1121,
    columnNumber: 5
  }, this);
}
_c14 = SheetDataTable;
function SheetTagTable({ items }) {
  return /* @__PURE__ */ jsxDEV("table", { className: "w-full text-[12px]", children: /* @__PURE__ */ jsxDEV("tbody", { children: items.map(
    (it, i) => /* @__PURE__ */ jsxDEV("tr", { className: `border-b border-stone-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-stone-50/40"}`, children: [
      /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-2 w-10 text-stone-300 font-mono font-bold text-[10px]", children: i + 1 }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1150,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-2 text-stone-700 font-medium", children: String(it) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1151,
        columnNumber: 25
      }, this)
    ] }, i, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1149,
      columnNumber: 9
    }, this)
  ) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1147,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1146,
    columnNumber: 5
  }, this);
}
_c15 = SheetTagTable;
function SheetNoteTable({ items }) {
  return /* @__PURE__ */ jsxDEV("table", { className: "w-full text-[12px]", children: /* @__PURE__ */ jsxDEV("tbody", { children: items.map(
    (it, i) => /* @__PURE__ */ jsxDEV("tr", { className: `border-b border-stone-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-stone-50/40"}`, children: [
      /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-2 w-8 text-stone-300 font-bold", children: "â¢" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1165,
        columnNumber: 25
      }, this),
      /* @__PURE__ */ jsxDEV("td", { className: "px-4 py-2 text-stone-600 leading-relaxed", children: String(it) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1166,
        columnNumber: 25
      }, this)
    ] }, i, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1164,
      columnNumber: 9
    }, this)
  ) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1162,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1161,
    columnNumber: 5
  }, this);
}
_c16 = SheetNoteTable;
function TeknikKart({ item, allItems, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onDelete }) {
  _s7();
  const [imgErr, setImgErr] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const clickTimer = useRef(null);
  const isDwg = ["dwg", "dxf", "stp", "step"].includes((item.file_type || "").toLowerCase());
  const va = item.meta?.vision_analysis;
  const isTR = va?.image_type === "teknik_resim";
  const bb = isTR ? va.baslik_bloku || {} : {};
  const status = item.meta?.transcription_status;
  const canAnalyze = status !== "processing" && !va;
  const bagli = item.meta?.bagli_dosyalar || {};
  const nestingId = bagli.nesting;
  const cadId = bagli.cad;
  const nestingItem = nestingId ? (allItems || []).find((i) => i.id === nestingId) : null;
  const nestingVision = nestingItem?.meta?.vision_analysis;
  const nestingMatNum = nestingVision?.malzeme_numarasi || "";
  const handleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      if (nestingId) onOpenLinked(nestingId);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onOpen(item);
      }, 220);
    }
  };
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    ctxMenu && /* @__PURE__ */ jsxDEV(
      ContextMenu,
      {
        x: ctxMenu.x,
        y: ctxMenu.y,
        item,
        onDelete,
        onClose: () => setCtxMenu(null)
      },
      void 0,
      false,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1217,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        onClick: handleClick,
        onContextMenu: handleContextMenu,
        className: "group bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-[#378ADD]/40 hover:shadow-lg transition-all cursor-pointer flex flex-col",
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "relative h-[140px] bg-stone-50 overflow-hidden", children: [
            !imgErr && !isDwg ? /* @__PURE__ */ jsxDEV(
              "img",
              {
                src: `/api/archive/file/${item.id}`,
                alt: item.filename,
                className: "w-full h-full object-contain p-2",
                onError: () => setImgErr(true)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1232,
                columnNumber: 11
              },
              this
            ) : /* @__PURE__ */ jsxDEV("div", { className: "w-full h-full flex flex-col items-center justify-center gap-2 text-stone-200", children: [
              /* @__PURE__ */ jsxDEV(Ruler, { size: 36, strokeWidth: 1 }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1240,
                columnNumber: 25
              }, this),
              isDwg && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] font-black tracking-widest text-stone-300", children: (item.file_type || "").toUpperCase() }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1241,
                columnNumber: 35
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1239,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      onOpen(item);
                    },
                    className: "flex items-center gap-1.5 px-3 py-1.5 bg-white text-stone-800 text-[11px] font-bold rounded-lg shadow hover:bg-stone-50",
                    children: [
                      /* @__PURE__ */ jsxDEV(Eye, { size: 12 }, void 0, false, {
                        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                        lineNumber: 1252,
                        columnNumber: 29
                      }, this),
                      " GÃ¶rÃ¼ntÃ¼le"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                    lineNumber: 1248,
                    columnNumber: 25
                  },
                  this
                ),
                canAnalyze && /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      onVectorize(item);
                    },
                    disabled: vectorizing === item.id,
                    className: "flex items-center gap-1.5 px-3 py-1.5 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg shadow hover:bg-[#2a6ab8] disabled:opacity-60",
                    children: [
                      vectorizing === item.id ? /* @__PURE__ */ jsxDEV(Loader2, { size: 11, className: "animate-spin" }, void 0, false, {
                        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                        lineNumber: 1260,
                        columnNumber: 60
                      }, this) : /* @__PURE__ */ jsxDEV(ScanLine, { size: 11 }, void 0, false, {
                        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                        lineNumber: 1260,
                        columnNumber: 109
                      }, this),
                      "Analiz Et"
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                    lineNumber: 1255,
                    columnNumber: 15
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1247,
                columnNumber: 21
              }, this),
              nestingId && /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    onOpenLinked(nestingId);
                  },
                  className: "flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-lg shadow hover:bg-orange-600 transition-colors",
                  children: [
                    /* @__PURE__ */ jsxDEV(Scissors, { size: 9 }, void 0, false, {
                      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                      lineNumber: 1270,
                      columnNumber: 29
                    }, this),
                    " Nesting AÃ§"
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1266,
                  columnNumber: 13
                },
                this
              )
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1246,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute top-2 left-2", children: /* @__PURE__ */ jsxDEV(StatusBadge, { item }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1276,
              columnNumber: 21
            }, this) }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1275,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "absolute top-2 right-2 flex items-center gap-1", children: [
              /* @__PURE__ */ jsxDEV(CadBadge, { item }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1279,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    onDetail(item);
                  },
                  title: "DetaylarÄ± gÃ¶ster",
                  className: "flex items-center justify-center w-5 h-5 rounded bg-white/80 text-stone-500 hover:bg-white hover:text-[#378ADD] shadow-sm transition-colors",
                  children: /* @__PURE__ */ jsxDEV(Table2, { size: 11, strokeWidth: 2.5 }, void 0, false, {
                    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                    lineNumber: 1285,
                    columnNumber: 25
                  }, this)
                },
                void 0,
                false,
                {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1280,
                  columnNumber: 21
                },
                this
              )
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1278,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1230,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "px-3.5 py-3 flex-1 flex flex-col gap-1 min-w-0", children: [
            isTR && bb.cizim_numarasi && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] font-black text-[#378ADD] tracking-widest uppercase", children: [
              "#",
              bb.cizim_numarasi
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1293,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-[12px] font-bold text-stone-800 truncate leading-snug", children: isTR && bb.baslik ? bb.baslik : item.filename.replace(/\.[^.]+$/, "") }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1297,
              columnNumber: 17
            }, this),
            isTR && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-1 mt-0.5", children: [
              bb.revizyon && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium", children: [
                "Rev ",
                bb.revizyon
              ] }, void 0, true, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1302,
                columnNumber: 41
              }, this),
              bb.olcek && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium", children: bb.olcek }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1303,
                columnNumber: 38
              }, this),
              bb.malzeme && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium", children: bb.malzeme }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1304,
                columnNumber: 40
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1301,
              columnNumber: 11
            }, this),
            nestingId && nestingMatNum && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-100 rounded-lg mt-1", children: [
              /* @__PURE__ */ jsxDEV(Link2, { size: 9, className: "text-orange-400 shrink-0" }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1311,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] text-orange-500 font-bold truncate", children: nestingMatNum }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1312,
                columnNumber: 25
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1310,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "mt-auto pt-2 border-t border-stone-50 flex items-center justify-between gap-2", onClick: (e) => e.stopPropagation(), children: [
              /* @__PURE__ */ jsxDEV(LinkStatus, { item, onUnlink, onStartLink }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1318,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 text-[10px] text-stone-300", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "uppercase font-black", children: item.file_type }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1320,
                  columnNumber: 25
                }, this),
                fmtSize(item.file_size) && /* @__PURE__ */ jsxDEV("span", { children: [
                  "Â· ",
                  fmtSize(item.file_size)
                ] }, void 0, true, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1321,
                  columnNumber: 53
                }, this),
                /* @__PURE__ */ jsxDEV(
                  "a",
                  {
                    href: `/api/archive/download/${item.id}`,
                    onClick: (e) => e.stopPropagation(),
                    className: "ml-1 text-stone-300 hover:text-[#378ADD] transition-colors",
                    children: /* @__PURE__ */ jsxDEV(Download, { size: 11 }, void 0, false, {
                      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                      lineNumber: 1327,
                      columnNumber: 29
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                    lineNumber: 1322,
                    columnNumber: 25
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1319,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1317,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1291,
            columnNumber: 13
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1224,
        columnNumber: 9
      },
      this
    )
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1215,
    columnNumber: 5
  }, this);
}
_s7(TeknikKart, "p5MpVBfUES6jdqc0fHs7OedTHvk=");
_c17 = TeknikKart;
const LCOLS = { gridTemplateColumns: "minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.9fr) 80px 80px 80px 100px 110px 110px 60px" };
function ListHeader() {
  return /* @__PURE__ */ jsxDEV("div", { className: "grid gap-3 px-4 py-2 text-[10px] font-black tracking-widest uppercase text-stone-400 border-b border-stone-100 bg-white", style: LCOLS, children: [
    /* @__PURE__ */ jsxDEV("span", { children: "DOSYA ADI" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1343,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "ÃÄ°ZÄ°M NO" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1344,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "BAÅLIK" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1345,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "REVÄ°ZYON" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1346,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "ÃLÃEK" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1347,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "TÄ°P" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1348,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "DURUM" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1349,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "BOYUT" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1350,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: "TARÄ°H" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1351,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("span", {}, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1352,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1342,
    columnNumber: 5
  }, this);
}
_c18 = ListHeader;
function ListRow({ item, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onDelete }) {
  _s8();
  const [ctxMenu, setCtxMenu] = useState(null);
  const va = item.meta?.vision_analysis;
  const isTR = va?.image_type === "teknik_resim";
  const bb = isTR ? va.baslik_bloku || {} : {};
  const canAnalyze = !va && item.meta?.transcription_status !== "processing";
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    ctxMenu && /* @__PURE__ */ jsxDEV(
      ContextMenu,
      {
        x: ctxMenu.x,
        y: ctxMenu.y,
        item,
        onDelete,
        onClose: () => setCtxMenu(null)
      },
      void 0,
      false,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1367,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        onClick: () => onOpen(item),
        onContextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        },
        className: "group grid gap-3 px-4 py-2.5 items-center bg-white hover:bg-stone-50 border-b border-stone-100 cursor-pointer transition-colors",
        style: LCOLS,
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 min-w-0", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded text-white uppercase", style: { background: "#8b5cf6" }, children: (item.file_type || "IMG").slice(0, 4).toUpperCase() }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1381,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] font-semibold text-stone-800 truncate", children: item.filename.replace(/\.[^.]+$/, "") }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1384,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1380,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-[#378ADD] font-bold truncate", children: bb.cizim_numarasi || "â" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1386,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-stone-600 truncate", children: bb.baslik || "â" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1387,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-stone-500", children: bb.revizyon || "â" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1388,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-stone-500", children: bb.olcek || "â" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1389,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxDEV(LinkStatus, { item, onUnlink, onStartLink }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1391,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1390,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(StatusBadge, { item }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1393,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-stone-500", children: fmtSize(item.file_size) || "â" }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1394,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-[#378ADD] font-semibold", children: fmtDate(item.created_at) }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1395,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
            canAnalyze && /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  onVectorize(item);
                },
                disabled: vectorizing === item.id,
                title: "Analiz Et",
                className: "p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all",
                children: vectorizing === item.id ? /* @__PURE__ */ jsxDEV(Loader2, { size: 12, className: "animate-spin" }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1405,
                  columnNumber: 13
                }, this) : /* @__PURE__ */ jsxDEV(ScanLine, { size: 12 }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1406,
                  columnNumber: 13
                }, this)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1398,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  onDetail(item);
                },
                title: "DetaylarÄ± gÃ¶ster",
                className: "p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all",
                children: /* @__PURE__ */ jsxDEV(Table2, { size: 12 }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1415,
                  columnNumber: 21
                }, this)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1410,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "a",
              {
                href: `/api/archive/download/${item.id}`,
                onClick: (e) => e.stopPropagation(),
                className: "p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all",
                children: /* @__PURE__ */ jsxDEV(Download, { size: 12 }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1422,
                  columnNumber: 21
                }, this)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1417,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1396,
            columnNumber: 13
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1374,
        columnNumber: 9
      },
      this
    )
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1365,
    columnNumber: 5
  }, this);
}
_s8(ListRow, "KF2At5c2Bjxw3q0da40+KYJK27A=");
_c19 = ListRow;
const FILTERS = [
  { key: "all", label: "TÃ¼mÃ¼" },
  { key: "cad", label: "CAD", icon: Cpu },
  { key: "nesting", label: "Nesting", icon: Scissors },
  { key: "analyzed", label: "Analiz Edildi", icon: CheckCircle2 },
  { key: "pending", label: "Bekleyenler", icon: Clock }
];
export default function TeknikResimViewer({ onOpenFile }) {
  _s9();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [vectorizing, setVectorizing] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [linkModal, setLinkModal] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/archive/list");
      if (res.ok) {
        const data = await res.json();
        const TEKNIK_EXTS = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff", "pdf", "dwg", "dxf", "stp", "step"]);
        const imgs = (data.items || []).filter((i) => TEKNIK_EXTS.has((i.file_type || "").toLowerCase())).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setItems(imgs);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const processing = items.filter((i) => i.meta?.transcription_status === "processing");
    if (!processing.length) return;
    const t = setTimeout(load, 4e3);
    return () => clearTimeout(t);
  }, [items, load]);
  const filtered = items.filter((i) => {
    if (i.meta?.bagli_dosyalar?.cizim) return false;
    if (search.trim() && !i.filename.toLowerCase().includes(search.toLowerCase())) return false;
    const va = i.meta?.vision_analysis;
    const status = i.meta?.transcription_status;
    if (filter === "cad") return i.meta?.cad_turu === "cad";
    if (filter === "nesting") return i.meta?.cad_turu === "nesting";
    if (filter === "analyzed") return !!va;
    if (filter === "pending") return !va && status !== "processing";
    return true;
  });
  const counts = {
    all: items.length,
    cad: items.filter((i) => i.meta?.cad_turu === "cad").length,
    nesting: items.filter((i) => i.meta?.cad_turu === "nesting").length,
    analyzed: items.filter((i) => !!i.meta?.vision_analysis).length,
    pending: items.filter((i) => !i.meta?.vision_analysis && i.meta?.transcription_status !== "processing").length
  };
  const handleOpen = (item) => {
    if (!onOpenFile) return;
    onOpenFile({
      id: `img-${item.id}`,
      title: item.filename,
      type: "image-viewer",
      url: `/api/archive/file/${item.id}`,
      meta: { docId: item.id }
    });
  };
  const handleOpenLinked = useCallback((linkedId) => {
    if (!onOpenFile) return;
    const linked = items.find((i) => i.id === linkedId);
    const ext = linked?.file_type || "";
    const IMAGE_EXT = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"]);
    const type = IMAGE_EXT.has(ext) ? "image-viewer" : ["pdf"].includes(ext) ? "pdf" : ["docx", "doc"].includes(ext) ? "docx" : ["xlsx", "xls"].includes(ext) ? "xls" : "archive-docs";
    onOpenFile({
      id: `linked-${linkedId}`,
      title: linked?.filename || "BaÄlÄ± Dosya",
      type,
      url: `/api/archive/file/${linkedId}`,
      meta: { docId: linkedId }
    });
  }, [items, onOpenFile]);
  const handleUnlink = useCallback(async (sourceId, linkType) => {
    await fetch(`/api/archive/link?source_id=${sourceId}&link_type=${linkType}`, { method: "DELETE" });
    load();
  }, [load]);
  const handleVectorize = async (item) => {
    setVectorizing(item.id);
    try {
      const res = await fetch(`/api/archive/vectorize/${item.id}`, { method: "POST" });
      if (res.ok) subscribeToDocProgress(item.id, item.filename, load);
    } catch {
    } finally {
      setVectorizing(null);
    }
  };
  const handleDelete = useCallback(async (item) => {
    try {
      await fetch(`/api/archive/documents/${item.id}`, { method: "DELETE" });
      load();
    } catch {
    }
  }, [load]);
  const processingCount = items.filter((i) => i.meta?.transcription_status === "processing").length;
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    detailItem && /* @__PURE__ */ jsxDEV(
      DataTableModal,
      {
        item: items.find((i) => i.id === detailItem.id) || detailItem,
        allItems: items,
        onClose: () => setDetailItem(null)
      },
      void 0,
      false,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1555,
        columnNumber: 7
      },
      this
    ),
    uploadModal && /* @__PURE__ */ jsxDEV(UploadModal, { onClose: () => setUploadModal(false), onUploaded: load, onAnalysisDone: load }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1562,
      columnNumber: 7
    }, this),
    linkModal && /* @__PURE__ */ jsxDEV(
      LinkModal,
      {
        sourceItem: linkModal.item,
        linkType: linkModal.linkType,
        onClose: () => setLinkModal(null),
        onLinked: load
      },
      void 0,
      false,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1565,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col h-full w-full bg-stone-50 font-sans overflow-hidden", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex-none bg-white border-b border-stone-200", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between gap-4 px-7 pt-6 pb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "p-3 bg-[#378ADD]/10 rounded-2xl shrink-0 relative", children: [
              /* @__PURE__ */ jsxDEV(Ruler, { size: 22, className: "text-[#378ADD]", strokeWidth: 2 }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1579,
                columnNumber: 29
              }, this),
              processingCount > 0 && /* @__PURE__ */ jsxDEV("span", { className: "absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-[8px] font-black rounded-full flex items-center justify-center", children: processingCount }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1581,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1578,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV("h1", { className: "text-[20px] font-black text-stone-900 tracking-tight", children: "Teknik Resimler" }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1588,
                  columnNumber: 33
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full tabular-nums", children: items.length }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1589,
                  columnNumber: 33
                }, this),
                counts.teknik > 0 && /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full tabular-nums border border-emerald-200", children: [
                  counts.teknik,
                  " analiz"
                ] }, void 0, true, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1593,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1587,
                columnNumber: 29
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-400 font-medium mt-0.5", children: "MÃ¼hendislik Ã§izimleri, imalat resimleri, teknik Åemalar" }, void 0, false, {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1598,
                columnNumber: 29
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1586,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1577,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: load,
                className: "p-2 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors",
                title: "Yenile",
                children: /* @__PURE__ */ jsxDEV(RefreshCw, { size: 14 }, void 0, false, {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1610,
                  columnNumber: 29
                }, this)
              },
              void 0,
              false,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1605,
                columnNumber: 25
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setUploadModal(true),
                className: "flex items-center gap-1.5 px-4 py-2 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors",
                children: [
                  /* @__PURE__ */ jsxDEV(Upload, { size: 14 }, void 0, false, {
                    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                    lineNumber: 1617,
                    columnNumber: 29
                  }, this),
                  " YÃ¼kle"
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1613,
                columnNumber: 25
              },
              this
            )
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1604,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 1576,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 px-7 pb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "relative w-[320px] shrink-0", children: [
            /* @__PURE__ */ jsxDEV(Search, { size: 13, className: "absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1625,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                value: search,
                onChange: (e) => setSearch(e.target.value),
                placeholder: "Ã§izim adÄ±, numarasÄ±, baÅlÄ±k...",
                className: "w-full pl-8 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
              },
              void 0,
              false,
              {
                fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                lineNumber: 1626,
                columnNumber: 25
              },
              this
            ),
            search && /* @__PURE__ */ jsxDEV("button", { onClick: () => setSearch(""), className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600", children: /* @__PURE__ */ jsxDEV(X, { size: 11 }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1634,
              columnNumber: 33
            }, this) }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1633,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1624,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-0.5 ml-auto", children: [
            FILTERS.map(
              (f) => /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setFilter(f.key),
                  className: `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0
                                    ${filter === f.key ? "bg-[#378ADD]/10 text-[#378ADD]" : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"}`,
                  children: [
                    f.icon && /* @__PURE__ */ jsxDEV(f.icon, { size: 11, strokeWidth: 2 }, void 0, false, {
                      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                      lineNumber: 1647,
                      columnNumber: 44
                    }, this),
                    f.label,
                    /* @__PURE__ */ jsxDEV("span", { className: `text-[10px] font-bold tabular-nums ${filter === f.key ? "text-[#378ADD]" : "text-stone-400"}`, children: counts[f.key] }, void 0, false, {
                      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                      lineNumber: 1649,
                      columnNumber: 33
                    }, this)
                  ]
                },
                f.key,
                true,
                {
                  fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
                  lineNumber: 1641,
                  columnNumber: 15
                },
                this
              )
            ),
            /* @__PURE__ */ jsxDEV("div", { className: "w-px h-4 bg-stone-200 mx-1 shrink-0" }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1654,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("button", { onClick: () => setView("list"), className: `p-1.5 rounded-lg transition-all ${view === "list" ? "bg-stone-100 text-stone-700" : "text-stone-400 hover:bg-stone-100"}`, children: /* @__PURE__ */ jsxDEV(List, { size: 14 }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1655,
              columnNumber: 200
            }, this) }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1655,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV("button", { onClick: () => setView("grid"), className: `p-1.5 rounded-lg transition-all ${view === "grid" ? "bg-stone-100 text-stone-700" : "text-stone-400 hover:bg-stone-100"}`, children: /* @__PURE__ */ jsxDEV(Grid, { size: 14 }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1656,
              columnNumber: 200
            }, this) }, void 0, false, {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1656,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1639,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 1623,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1575,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-y-auto p-6 minimal-scroll", children: loading ? /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center h-48 gap-2 text-stone-400", children: [
        /* @__PURE__ */ jsxDEV(Loader2, { size: 20, className: "animate-spin text-[#378ADD]" }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 1665,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-[12px] font-medium", children: "YÃ¼kleniyor..." }, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 1666,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1664,
        columnNumber: 11
      }, this) : filtered.length === 0 ? /* @__PURE__ */ jsxDEV(EmptyState, { search, filter, onUpload: () => setUploadModal(true) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1669,
        columnNumber: 11
      }, this) : view === "grid" ? /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4", children: filtered.map(
        (item) => /* @__PURE__ */ jsxDEV(
          TeknikKart,
          {
            item,
            allItems: items,
            onOpen: handleOpen,
            onVectorize: handleVectorize,
            vectorizing,
            onOpenLinked: handleOpenLinked,
            onStartLink: (it, lt) => setLinkModal({ item: it, linkType: lt }),
            onUnlink: handleUnlink,
            onDetail: setDetailItem,
            onDelete: handleDelete
          },
          item.id,
          false,
          {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1673,
            columnNumber: 13
          },
          this
        )
      ) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1671,
        columnNumber: 11
      }, this) : /* @__PURE__ */ jsxDEV("div", { className: "bg-white border border-stone-200 rounded-xl overflow-hidden", children: [
        /* @__PURE__ */ jsxDEV(ListHeader, {}, void 0, false, {
          fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
          lineNumber: 1690,
          columnNumber: 25
        }, this),
        filtered.map(
          (item) => /* @__PURE__ */ jsxDEV(
            ListRow,
            {
              item,
              onOpen: handleOpen,
              onVectorize: handleVectorize,
              vectorizing,
              onOpenLinked: handleOpenLinked,
              onStartLink: (it, lt) => setLinkModal({ item: it, linkType: lt }),
              onUnlink: handleUnlink,
              onDetail: setDetailItem,
              onDelete: handleDelete
            },
            item.id,
            false,
            {
              fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
              lineNumber: 1692,
              columnNumber: 13
            },
            this
          )
        )
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1689,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1662,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1572,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1553,
    columnNumber: 5
  }, this);
}
_s9(TeknikResimViewer, "tcJO3EX25XGMVPgtbE/ZzFefIzw=");
_c20 = TeknikResimViewer;
function EmptyState({ search, filter, onUpload }) {
  if (search) {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-48 gap-3", children: [
      /* @__PURE__ */ jsxDEV(Search, { size: 36, strokeWidth: 1, className: "text-stone-300" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1718,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] font-semibold text-stone-400", children: [
        '"',
        search,
        '" ile eÅleÅen resim bulunamadÄ±'
      ] }, void 0, true, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1719,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1717,
      columnNumber: 7
    }, this);
  }
  if (filter !== "all") {
    return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-48 gap-3", children: [
      /* @__PURE__ */ jsxDEV(Layers, { size: 36, strokeWidth: 1, className: "text-stone-300" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1726,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-[12px] font-semibold text-stone-400", children: "Bu filtrede kayÄ±t yok" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1727,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1725,
      columnNumber: 7
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center justify-center h-64 gap-4", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "p-5 bg-[#378ADD]/8 rounded-3xl border-2 border-dashed border-[#378ADD]/20", children: /* @__PURE__ */ jsxDEV(Ruler, { size: 44, strokeWidth: 1.2, className: "text-[#378ADD]/50" }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1734,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1733,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxDEV("p", { className: "text-[14px] font-bold text-stone-600", children: "HenÃ¼z teknik resim yok" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1737,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-stone-400 mt-1", children: "PNG, JPG veya JPEG formatÄ±nda Ã§izimlerinizi yÃ¼kleyin" }, void 0, false, {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1738,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
      lineNumber: 1736,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        onClick: onUpload,
        className: "flex items-center gap-2 px-5 py-2.5 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors",
        children: [
          /* @__PURE__ */ jsxDEV(Upload, { size: 14 }, void 0, false, {
            fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
            lineNumber: 1744,
            columnNumber: 17
          }, this),
          " Ä°lk resmi yÃ¼kle"
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
        lineNumber: 1740,
        columnNumber: 13
      },
      this
    )
  ] }, void 0, true, {
    fileName: "C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx",
    lineNumber: 1732,
    columnNumber: 5
  }, this);
}
_c21 = EmptyState;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13, _c14, _c15, _c16, _c17, _c18, _c19, _c20, _c21;
$RefreshReg$(_c, "ContextMenu");
$RefreshReg$(_c2, "StatusBadge");
$RefreshReg$(_c3, "CadBadge");
$RefreshReg$(_c4, "FileSlot");
$RefreshReg$(_c5, "UploadModal");
$RefreshReg$(_c6, "LinkModal");
$RefreshReg$(_c7, "LinkStatus");
$RefreshReg$(_c8, "DataTableModal");
$RefreshReg$(_c9, "EmptyAnalysisState");
$RefreshReg$(_c0, "GenericSection");
$RefreshReg$(_c1, "ExcelSheet");
$RefreshReg$(_c10, "TeknikTable");
$RefreshReg$(_c11, "NestingTable");
$RefreshReg$(_c12, "SheetBlock");
$RefreshReg$(_c13, "SheetKVTable");
$RefreshReg$(_c14, "SheetDataTable");
$RefreshReg$(_c15, "SheetTagTable");
$RefreshReg$(_c16, "SheetNoteTable");
$RefreshReg$(_c17, "TeknikKart");
$RefreshReg$(_c18, "ListHeader");
$RefreshReg$(_c19, "ListRow");
$RefreshReg$(_c20, "TeknikResimViewer");
$RefreshReg$(_c21, "EmptyState");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/fatih.tekin/.gemini/antigravity/scratch/proje001/src/components/settings/archive/TeknikResimViewer.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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IiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJ1c2VDYWxsYmFjayIsInVzZVJlZiIsIlhMU1giLCJSdWxlciIsIlNlYXJjaCIsIlgiLCJMb2FkZXIyIiwiR3JpZCIsIkxpc3QiLCJVcGxvYWQiLCJSZWZyZXNoQ3ciLCJEb3dubG9hZCIsIkV5ZSIsIkFsZXJ0VHJpYW5nbGUiLCJDaGVja0NpcmNsZTIiLCJDbG9jayIsIlNjYW5MaW5lIiwiTGF5ZXJzIiwiRmlsZVRleHQiLCJUYWJsZTIiLCJDcHUiLCJTY2lzc29ycyIsIkxpbmsyIiwiTGluazJPZmYiLCJGb2xkZXJPcGVuIiwiRXh0ZXJuYWxMaW5rIiwiVHJhc2gyIiwidXNlRXJyb3JTdG9yZSIsIklNQUdFX0VYVFMiLCJTZXQiLCJpc0ltYWdlIiwidCIsImhhcyIsInRvTG93ZXJDYXNlIiwic3Vic2NyaWJlVG9Eb2NQcm9ncmVzcyIsImRvY0lkIiwiZmlsZW5hbWUiLCJvbkRvbmUiLCJhZGRUb2FzdCIsInVwZGF0ZVRvYXN0IiwicmVwbGFjZVRvYXN0IiwiZ2V0U3RhdGUiLCJzaG9ydCIsImxlbmd0aCIsInNsaWNlIiwidG9hc3RJZCIsInR5cGUiLCJtZXNzYWdlIiwiZHVyYXRpb24iLCJza2lwRGVkdXBlIiwiZXMiLCJFdmVudFNvdXJjZSIsIm9ubWVzc2FnZSIsImUiLCJkYXRhIiwiSlNPTiIsInBhcnNlIiwiZG9uZSIsImNsb3NlIiwic3RlcCIsImVycm9yIiwib25lcnJvciIsImZtdFNpemUiLCJiIiwidG9GaXhlZCIsImZtdERhdGUiLCJzIiwiRGF0ZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsImRheSIsIm1vbnRoIiwieWVhciIsIkNvbnRleHRNZW51IiwieCIsInkiLCJpdGVtIiwib25EZWxldGUiLCJvbkNsb3NlIiwiX3MiLCJyZWYiLCJoYW5kbGVyIiwiY3VycmVudCIsImNvbnRhaW5zIiwidGFyZ2V0IiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsInRvcCIsImxlZnQiLCJTdGF0dXNCYWRnZSIsInN0YXR1cyIsIm1ldGEiLCJ0cmFuc2NyaXB0aW9uX3N0YXR1cyIsInZhIiwidmlzaW9uX2FuYWx5c2lzIiwiaW1nVHlwZSIsImltYWdlX3R5cGUiLCJfYzIiLCJDYWRCYWRnZSIsImNhZF90dXJ1IiwiX2MzIiwiRmlsZVNsb3QiLCJsYWJlbCIsImNvbG9yIiwiaWNvbiIsIkljb24iLCJmaWxlIiwib25GaWxlIiwiaW5wdXRSZWYiLCJhY2NlcHQiLCJmaWxsZWQiLCJ2aW9sZXQiLCJvcmFuZ2UiLCJpY29uQ29sb3IiLCJmaWxlcyIsImNsaWNrIiwic3BsaXQiLCJuYW1lIiwic2l6ZSIsInN0b3BQcm9wYWdhdGlvbiIsInZhbHVlIiwiX2M0IiwiVXBsb2FkTW9kYWwiLCJvblVwbG9hZGVkIiwib25BbmFseXNpc0RvbmUiLCJfczIiLCJjaXppbUZpbGUiLCJzZXRDaXppbUZpbGUiLCJuZXN0aW5nRmlsZSIsInNldE5lc3RpbmdGaWxlIiwidXBsb2FkaW5nIiwic2V0VXBsb2FkaW5nIiwicHJvZ3Jlc3MiLCJzZXRQcm9ncmVzcyIsImNpemltUmVmIiwibmVzdGluZ1JlZiIsImNhblVwbG9hZCIsImhhbmRsZVVwbG9hZCIsImNpemltSWQiLCJuZXN0aW5nSWQiLCJmZCIsIkZvcm1EYXRhIiwiYXBwZW5kIiwicmVzIiwiZmV0Y2giLCJtZXRob2QiLCJib2R5IiwianNvbiIsImlkIiwiaGVhZGVycyIsInN0cmluZ2lmeSIsInNvdXJjZV9pZCIsInRhcmdldF9pZCIsImxpbmtfdHlwZSIsIkxpbmtNb2RhbCIsInNvdXJjZUl0ZW0iLCJsaW5rVHlwZSIsIm9uTGlua2VkIiwiX3MzIiwiaXNWaW9sZXQiLCJjYWRUdXJ1IiwicmluZyIsImljb25DbHMiLCJoYW5kbGVGaWxlIiwiTGlua1N0YXR1cyIsIm9uVW5saW5rIiwib25TdGFydExpbmsiLCJiYWdsaSIsImJhZ2xpX2Rvc3lhbGFyIiwiY2FkSWQiLCJjYWQiLCJuZXN0aW5nIiwiX2M3IiwiX3NldENvbFdpZHRocyIsIndzIiwid2lkdGhzIiwibWFwIiwidyIsIndjaCIsIl9idWlsZFRla25pa1NoZWV0IiwiYmIiLCJiYXNsaWtfYmxva3UiLCJyb3dzIiwicHVzaCIsImNpemltX251bWFyYXNpIiwia2ltbGlrX251bWFyYXNpIiwiYmFzbGlrIiwiZmlybWEiLCJwcm9qZSIsInJldml6eW9uIiwib2xjZWsiLCJ0YXJpaCIsImNpemVuIiwib25heWxheWFuIiwia29udHJvbF9lZGVuIiwibWFsemVtZSIsInl1emV5X2lzbGVtIiwic2VydGxpayIsImFnaXJsaWsiLCJiaXJpbSIsImJsYXR0X2Zvcm1hdCIsInNheWZhIiwiZm9yRWFjaCIsImsiLCJ2IiwiU3RyaW5nIiwicGFyY2FfbGlzdGVzaSIsInAiLCJwb3oiLCJhZGV0IiwiY2l6aW1fbm8iLCJ5YXJpbV9tYW11bCIsImFjaWtsYW1hIiwib2xjdWxhciIsIm8iLCJldGlrZXQiLCJkZWdlciIsInRvbGVyYW5zIiwidG9sZXJhbnNsYXIiLCJ0aXAiLCJpc2xlbV9zaXJhc2kiLCJzaXJhIiwiaXNsZW0iLCJpIiwibm90bGFyIiwibiIsImdlbmVsX21ldGluIiwidXRpbHMiLCJhb2FfdG9fc2hlZXQiLCJfYnVpbGROZXN0aW5nU2hlZXQiLCJwcm9ncmFtX2FkaSIsIm1hbHplbWVfbnVtYXJhc2kiLCJrYWxpbmxpayIsImxldmhhX2JveXV0dSIsInRvcGxhbV9wYXJjYV9hZGVkaSIsImt1bGxhbmltX29yYW5pIiwiZmlyZV9vcmFuaSIsImlzbGVtbGVyIiwicGFyY2FfYWRpIiwiZG93bmxvYWRFeGNlbCIsImxpbmtlZEl0ZW0iLCJ3YiIsImJvb2tfbmV3IiwibHZhIiwiYm9va19hcHBlbmRfc2hlZXQiLCJyZXBsYWNlIiwid3JpdGVGaWxlIiwiRGF0YVRhYmxlTW9kYWwiLCJhbGxJdGVtcyIsIl9zNCIsImxpbmtlZElkIiwiY2l6aW0iLCJmaW5kIiwiaW5pdFRhYiIsInRhYiIsInNldFRhYiIsImhhc1Rla25payIsImhhc05lc3RpbmciLCJhY3RpdmVWYSIsImhhc0FueSIsIndpZHRoIiwiaGVpZ2h0IiwidmlzaW9uX2Vycm9yIiwiRW1wdHlBbmFseXNpc1N0YXRlIiwidmlzaW9uRXJyb3IiLCJfczUiLCJjZmciLCJzZXRDZmciLCJ0aGVuIiwiciIsImNhdGNoIiwiZHAiLCJkb2NfcHJvY2Vzc2luZyIsInZmIiwidmlzaW9uX2ZhbGxiYWNrIiwiaW5mbyIsImZvdW5kIiwiaGFzX2tleSIsIm1vZGVsX2lkIiwic3RvcmVkIiwicHJvdmlkZXIiLCJHZW5lcmljU2VjdGlvbiIsIkFycmF5IiwiaXNBcnJheSIsImZpcnN0IiwiY29scyIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJNYXRoIiwiZmxvb3IiLCJlbnRyaWVzIiwiZmlsdGVyIiwiX2MwIiwiRXhjZWxTaGVldCIsImlzS1YiLCJ2YWwiLCJoIiwicm93IiwiX2MxIiwiVGVrbmlrVGFibGUiLCJfczYiLCJsbG1Ta2lwcGVkIiwibGxtX3NraXBwZWQiLCJTRUNUSU9OX0xBQkVMUyIsInl1emV5X2lzbGVtbGVyaSIsImtlc2l0bGVyIiwicGFyY2FfdGFuaW0iLCJnZW9tZXRyaWsiLCJtYWx6ZW1lX3VyZXRpbSIsIml6bGVuZWJpbGlybGlrIiwiRklFTERfTEFCRUxTIiwicGFyY2Ffa29kdSIsInNheWZhX2JpbGdpc2kiLCJhY2lsaW1fdXp1bmx1Z3UiLCJib3l1dGxhciIsImJ1a21lX3lhcmljYXBpIiwia2VuYXJfbWVzYWZlbGVyaSIsImtlc2l0IiwieXV6ZXlfc3RhbmRhcmRpIiwia2VzaW1fc3RhbmRhcmRpIiwic2F5ZmFfZm9ybWF0aSIsInRhbGFzbGlfdG9sZXJhbnMiLCJ0YWxhc3Npel90b2xlcmFucyIsImtheW5ha2xpX3RvbGVyYW5zIiwiZG9rdW1fdG9sZXJhbnMiLCJjaXppbV90YXJpaGkiLCJrYWxpdGVfa29udHJvbCIsImNhZF9iaWxnaXNpIiwiU0tJUCIsInNlY3Rpb25zIiwidGl0bGUiLCJyYXdDb2xzIiwiYyIsIm91dCIsInRyaW0iLCJ0ZXh0IiwiYWN0aXZlS2V5Iiwic2V0QWN0aXZlS2V5IiwiYWN0aXZlIiwiTmVzdGluZ1RhYmxlIiwiZ2VuZWxSb3dzIiwiX2MxMSIsIlNoZWV0QmxvY2siLCJjaGlsZHJlbiIsImhkciIsImJsdWUiLCJlbWVyYWxkIiwic3RvbmUiLCJfYzEyIiwiU2hlZXRLVlRhYmxlIiwiaGlnaGxpZ2h0S2V5cyIsImhpIiwiaW5jbHVkZXMiLCJfYzEzIiwiU2hlZXREYXRhVGFibGUiLCJfYzE0IiwiU2hlZXRUYWdUYWJsZSIsIml0ZW1zIiwiaXQiLCJfYzE1IiwiU2hlZXROb3RlVGFibGUiLCJfYzE2IiwiVGVrbmlrS2FydCIsIm9uT3BlbiIsIm9uVmVjdG9yaXplIiwidmVjdG9yaXppbmciLCJvbk9wZW5MaW5rZWQiLCJvbkRldGFpbCIsIl9zNyIsImltZ0VyciIsInNldEltZ0VyciIsImN0eE1lbnUiLCJzZXRDdHhNZW51IiwiY2xpY2tUaW1lciIsImlzRHdnIiwiZmlsZV90eXBlIiwiaXNUUiIsImNhbkFuYWx5emUiLCJuZXN0aW5nSXRlbSIsIm5lc3RpbmdWaXNpb24iLCJuZXN0aW5nTWF0TnVtIiwiaGFuZGxlQ2xpY2siLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiaGFuZGxlQ29udGV4dE1lbnUiLCJwcmV2ZW50RGVmYXVsdCIsImNsaWVudFgiLCJjbGllbnRZIiwidG9VcHBlckNhc2UiLCJmaWxlX3NpemUiLCJMQ09MUyIsImdyaWRUZW1wbGF0ZUNvbHVtbnMiLCJMaXN0SGVhZGVyIiwiX2MxOCIsIkxpc3RSb3ciLCJfczgiLCJiYWNrZ3JvdW5kIiwiY3JlYXRlZF9hdCIsIkZJTFRFUlMiLCJUZWtuaWtSZXNpbVZpZXdlciIsIm9uT3BlbkZpbGUiLCJfczkiLCJzZXRJdGVtcyIsImxvYWRpbmciLCJzZXRMb2FkaW5nIiwic2VhcmNoIiwic2V0U2VhcmNoIiwic2V0RmlsdGVyIiwidmlldyIsInNldFZpZXciLCJzZXRWZWN0b3JpemluZyIsInVwbG9hZE1vZGFsIiwic2V0VXBsb2FkTW9kYWwiLCJsaW5rTW9kYWwiLCJzZXRMaW5rTW9kYWwiLCJkZXRhaWxJdGVtIiwic2V0RGV0YWlsSXRlbSIsImxvYWQiLCJvayIsIlRFS05JS19FWFRTIiwiaW1ncyIsInNvcnQiLCJhIiwicHJvY2Vzc2luZyIsImZpbHRlcmVkIiwiY291bnRzIiwiYWxsIiwiYW5hbHl6ZWQiLCJwZW5kaW5nIiwiaGFuZGxlT3BlbiIsInVybCIsImhhbmRsZU9wZW5MaW5rZWQiLCJsaW5rZWQiLCJleHQiLCJJTUFHRV9FWFQiLCJoYW5kbGVVbmxpbmsiLCJzb3VyY2VJZCIsImhhbmRsZVZlY3Rvcml6ZSIsImhhbmRsZURlbGV0ZSIsInByb2Nlc3NpbmdDb3VudCIsInRla25payIsImYiLCJsdCIsIkVtcHR5U3RhdGUiLCJvblVwbG9hZCIsIl9jMjEiLCJfYyIsIl9jNSIsIl9jNiIsIl9jOCIsIl9jOSIsIl9jMTAiLCJfYzE3IiwiX2MxOSIsIl9jMjAiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiVGVrbmlrUmVzaW1WaWV3ZXIuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyB1c2VTdGF0ZSwgdXNlRWZmZWN0LCB1c2VDYWxsYmFjaywgdXNlUmVmIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7XG4gICAgUnVsZXIsIFNlYXJjaCwgWCwgTG9hZGVyMiwgR3JpZCwgTGlzdCwgVXBsb2FkLCBSZWZyZXNoQ3csXG4gICAgRG93bmxvYWQsIEV5ZSwgQWxlcnRUcmlhbmdsZSwgQ2hlY2tDaXJjbGUyLCBDbG9jaywgU2NhbkxpbmUsXG4gICAgTGF5ZXJzLCBGaWxlVGV4dCwgVGFibGUyLCBDcHUsIFNjaXNzb3JzLCBMaW5rMiwgTGluazJPZmYsXG4gICAgRm9sZGVyT3BlbiwgRXh0ZXJuYWxMaW5rLCBUcmFzaDJcbn0gZnJvbSAnbHVjaWRlLXJlYWN0JztcblxuaW1wb3J0IHsgdXNlRXJyb3JTdG9yZSB9IGZyb20gJy4uLy4uLy4uL3N0b3JlL2Vycm9yU3RvcmUnO1xuXG5jb25zdCBJTUFHRV9FWFRTID0gbmV3IFNldChbJ3BuZycsICdqcGcnLCAnanBlZycsICd3ZWJwJywgJ2JtcCcsICdnaWYnLCAndGlmZiddKTtcbmNvbnN0IGlzSW1hZ2UgPSB0ID0+IElNQUdFX0VYVFMuaGFzKCh0IHx8ICcnKS50b0xvd2VyQ2FzZSgpKTtcblxuLyog4pSA4pSAIEJlbGdlIGnFn2xlbWUgaWxlcmxlbWVzaW5pIFNTRSDDvHplcmluZGVuIHRvYXN0J2EgeWFuc8SxdCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmZ1bmN0aW9uIHN1YnNjcmliZVRvRG9jUHJvZ3Jlc3MoZG9jSWQsIGZpbGVuYW1lLCBvbkRvbmUpIHtcbiAgICBjb25zdCB7IGFkZFRvYXN0LCB1cGRhdGVUb2FzdCwgcmVwbGFjZVRvYXN0IH0gPSB1c2VFcnJvclN0b3JlLmdldFN0YXRlKCk7XG5cbiAgICBjb25zdCBzaG9ydCA9IGZpbGVuYW1lLmxlbmd0aCA+IDI4ID8gZmlsZW5hbWUuc2xpY2UoMCwgMjUpICsgJ+KApicgOiBmaWxlbmFtZTtcblxuICAgIGNvbnN0IHRvYXN0SWQgPSBhZGRUb2FzdCh7XG4gICAgICAgIHR5cGU6ICdsb2FkaW5nJyxcbiAgICAgICAgbWVzc2FnZTogYCR7c2hvcnR9IOKAlCBpxZ9sZW1lIGFsxLFuZMSxYCxcbiAgICAgICAgZHVyYXRpb246IDAsXG4gICAgICAgIHNraXBEZWR1cGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBlcyA9IG5ldyBFdmVudFNvdXJjZShgL2FwaS9hcmNoaXZlL3Byb2dyZXNzLyR7ZG9jSWR9YCk7XG5cbiAgICBlcy5vbm1lc3NhZ2UgPSAoZSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoZS5kYXRhKTtcbiAgICAgICAgICAgIGlmIChkYXRhLmRvbmUpIHtcbiAgICAgICAgICAgICAgICBlcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHJlcGxhY2VUb2FzdCh0b2FzdElkLCB7IHR5cGU6ICdzdWNjZXNzJywgbWVzc2FnZTogYCR7c2hvcnR9IOKAlCAke2RhdGEuc3RlcH1gLCBkdXJhdGlvbjogNTAwMCB9KTtcbiAgICAgICAgICAgICAgICBpZiAob25Eb25lKSBvbkRvbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgICAgIGVzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgcmVwbGFjZVRvYXN0KHRvYXN0SWQsIHsgdHlwZTogJ2Vycm9yJywgbWVzc2FnZTogYCR7c2hvcnR9IOKAlCAke2RhdGEuc3RlcH1gLCBkdXJhdGlvbjogNzAwMCB9KTtcbiAgICAgICAgICAgICAgICBpZiAob25Eb25lKSBvbkRvbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlVG9hc3QodG9hc3RJZCwgeyBtZXNzYWdlOiBgJHtzaG9ydH0g4oCUICR7ZGF0YS5zdGVwfWAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICB9O1xuXG4gICAgZXMub25lcnJvciA9ICgpID0+IGVzLmNsb3NlKCk7XG59XG5cbmZ1bmN0aW9uIGZtdFNpemUoYikge1xuICAgIGlmICghYikgcmV0dXJuIG51bGw7XG4gICAgaWYgKGIgPCAxMDI0KSByZXR1cm4gYCR7Yn0gQmA7XG4gICAgaWYgKGIgPCAxMDI0ICogMTAyNCkgcmV0dXJuIGAkeyhiIC8gMTAyNCkudG9GaXhlZCgwKX0gS0JgO1xuICAgIHJldHVybiBgJHsoYiAvICgxMDI0ICogMTAyNCkpLnRvRml4ZWQoMSl9IE1CYDtcbn1cbmZ1bmN0aW9uIGZtdERhdGUocykge1xuICAgIHJldHVybiBuZXcgRGF0ZShzKS50b0xvY2FsZURhdGVTdHJpbmcoJ3RyJywgeyBkYXk6ICcyLWRpZ2l0JywgbW9udGg6ICdzaG9ydCcsIHllYXI6ICdudW1lcmljJyB9KTtcbn1cblxuLyog4pSA4pSAIFNhxJ8gdMSxayBtZW7DvHPDvCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmZ1bmN0aW9uIENvbnRleHRNZW51KHsgeCwgeSwgaXRlbSwgb25EZWxldGUsIG9uQ2xvc2UgfSkge1xuICAgIGNvbnN0IHJlZiA9IHVzZVJlZihudWxsKTtcblxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlZi5jdXJyZW50ICYmICFyZWYuY3VycmVudC5jb250YWlucyhlLnRhcmdldCkpIG9uQ2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgaGFuZGxlcik7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgaGFuZGxlcik7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgfSwgW29uQ2xvc2VdKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXZcbiAgICAgICAgICAgIHJlZj17cmVmfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiZml4ZWQgei1bMTAwXSBiZy13aGl0ZSBib3JkZXIgYm9yZGVyLXN0b25lLTIwMCByb3VuZGVkLXhsIHNoYWRvdy0yeGwgb3ZlcmZsb3ctaGlkZGVuIHB5LTEgbWluLXctWzE2MHB4XVwiXG4gICAgICAgICAgICBzdHlsZT17eyB0b3A6IHksIGxlZnQ6IHggfX1cbiAgICAgICAgPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHsgb25EZWxldGUoaXRlbSk7IG9uQ2xvc2UoKTsgfX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41IHctZnVsbCBweC00IHB5LTIuNSB0ZXh0LVsxMnB4XSBmb250LXNlbWlib2xkIHRleHQtcmVkLTUwMCBob3ZlcjpiZy1yZWQtNTAgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxUcmFzaDIgc2l6ZT17MTN9IC8+IFNpbFxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG5cbi8qIOKUgOKUgCBEdXJ1bSByb3pldGkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5mdW5jdGlvbiBTdGF0dXNCYWRnZSh7IGl0ZW0gfSkge1xuICAgIGNvbnN0IHN0YXR1cyAgPSBpdGVtLm1ldGE/LnRyYW5zY3JpcHRpb25fc3RhdHVzO1xuICAgIGNvbnN0IHZhICAgICAgPSBpdGVtLm1ldGE/LnZpc2lvbl9hbmFseXNpcztcbiAgICBjb25zdCBpbWdUeXBlID0gdmE/LmltYWdlX3R5cGU7XG5cbiAgICBpZiAoc3RhdHVzID09PSAncHJvY2Vzc2luZycpIHJldHVybiAoXG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBweC0xLjUgcHktMC41IGJnLWFtYmVyLTUwIHRleHQtYW1iZXItNjAwIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1hbWJlci0yMDBcIj5cbiAgICAgICAgICAgIDxMb2FkZXIyIHNpemU9ezh9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpblwiIC8+IMSwxZ5MRU1ERVxuICAgICAgICA8L3NwYW4+XG4gICAgKTtcbiAgICBpZiAoaW1nVHlwZSA9PT0gJ3Rla25pa19yZXNpbScpIHJldHVybiAoXG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBweC0xLjUgcHktMC41IGJnLWVtZXJhbGQtNTAgdGV4dC1lbWVyYWxkLTYwMCB0ZXh0LVs5cHhdIGZvbnQtYm9sZCByb3VuZGVkIGJvcmRlciBib3JkZXItZW1lcmFsZC0yMDBcIj5cbiAgICAgICAgICAgIDxDaGVja0NpcmNsZTIgc2l6ZT17OH0gLz4gVEVLTsSwSyBSRVPEsE1cbiAgICAgICAgPC9zcGFuPlxuICAgICk7XG4gICAgaWYgKGltZ1R5cGUgPT09ICduZXN0aW5nJykgcmV0dXJuIChcbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTEuNSBweS0wLjUgYmctb3JhbmdlLTUwIHRleHQtb3JhbmdlLTYwMCB0ZXh0LVs5cHhdIGZvbnQtYm9sZCByb3VuZGVkIGJvcmRlciBib3JkZXItb3JhbmdlLTIwMFwiPlxuICAgICAgICAgICAgPFNjaXNzb3JzIHNpemU9ezh9IC8+IE5FU1TEsE5HXG4gICAgICAgIDwvc3Bhbj5cbiAgICApO1xuICAgIGlmICh2YSkgcmV0dXJuIChcbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTEuNSBweS0wLjUgYmctWyMzNzhBRERdLzEwIHRleHQtWyMzNzhBRERdIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1bIzM3OEFERF0vMjBcIj5cbiAgICAgICAgICAgIDxTY2FuTGluZSBzaXplPXs4fSAvPiBBTkFMxLBaIEVExLBMRMSwXG4gICAgICAgIDwvc3Bhbj5cbiAgICApO1xuICAgIGlmIChzdGF0dXMgPT09ICdkb25lJykgcmV0dXJuIChcbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTEuNSBweS0wLjUgYmctc3RvbmUtMTAwIHRleHQtc3RvbmUtNTAwIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zdG9uZS0yMDBcIj5cbiAgICAgICAgICAgIDxGaWxlVGV4dCBzaXplPXs4fSAvPiBWRUtUw5ZSxLBaRVxuICAgICAgICA8L3NwYW4+XG4gICAgKTtcbiAgICBpZiAoc3RhdHVzID09PSAncGVuZGluZycpIHJldHVybiAoXG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBweC0xLjUgcHktMC41IGJnLXN0b25lLTUwIHRleHQtc3RvbmUtNDAwIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zdG9uZS0yMDBcIj5cbiAgICAgICAgICAgIDxDbG9jayBzaXplPXs4fSAvPiBCRUtMxLBZT1JcbiAgICAgICAgPC9zcGFuPlxuICAgICk7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTEuNSBweS0wLjUgYmctc3RvbmUtNTAgdGV4dC1zdG9uZS0zMDAgdGV4dC1bOXB4XSBmb250LWJvbGQgcm91bmRlZCBib3JkZXIgYm9yZGVyLXN0b25lLTEwMFwiPlxuICAgICAgICAgICAgPEFsZXJ0VHJpYW5nbGUgc2l6ZT17OH0gLz4gQU5BTMSwWiBZT0tcbiAgICAgICAgPC9zcGFuPlxuICAgICk7XG59XG5cbi8qIOKUgOKUgCBDQUQgLyBOZXN0aW5nIHJvemV0aSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmZ1bmN0aW9uIENhZEJhZGdlKHsgaXRlbSB9KSB7XG4gICAgY29uc3QgdCA9IGl0ZW0ubWV0YT8uY2FkX3R1cnU7XG4gICAgaWYgKHQgPT09ICdjYWQnKSByZXR1cm4gKFxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMS41IHB5LTAuNSBiZy12aW9sZXQtNTAgdGV4dC12aW9sZXQtNjAwIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgYm9yZGVyIGJvcmRlci12aW9sZXQtMjAwXCI+XG4gICAgICAgICAgICA8Q3B1IHNpemU9ezh9IC8+IENBRFxuICAgICAgICA8L3NwYW4+XG4gICAgKTtcbiAgICBpZiAodCA9PT0gJ25lc3RpbmcnKSByZXR1cm4gKFxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMS41IHB5LTAuNSBiZy1vcmFuZ2UtNTAgdGV4dC1vcmFuZ2UtNTAwIHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1vcmFuZ2UtMjAwXCI+XG4gICAgICAgICAgICA8U2Npc3NvcnMgc2l6ZT17OH0gLz4gTkVTXG4gICAgICAgIDwvc3Bhbj5cbiAgICApO1xuICAgIHJldHVybiBudWxsO1xufVxuXG4vKiDilIDilIAgWcO8a2xlbWUgc2xvdHUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5mdW5jdGlvbiBGaWxlU2xvdCh7IGxhYmVsLCBjb2xvciwgaWNvbjogSWNvbiwgZmlsZSwgb25GaWxlLCBpbnB1dFJlZiwgYWNjZXB0IH0pIHtcbiAgICBjb25zdCBmaWxsZWQgPSB7XG4gICAgICAgIHZpb2xldDogJ2JnLXZpb2xldC01MCBib3JkZXItdmlvbGV0LTMwMCcsXG4gICAgICAgIG9yYW5nZTogJ2JnLW9yYW5nZS01MCBib3JkZXItb3JhbmdlLTMwMCcsXG4gICAgfTtcbiAgICBjb25zdCBpY29uQ29sb3IgPSB7IHZpb2xldDogJ3RleHQtdmlvbGV0LTYwMCcsIG9yYW5nZTogJ3RleHQtb3JhbmdlLTUwMCcgfTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8aW5wdXQgcmVmPXtpbnB1dFJlZn0gdHlwZT1cImZpbGVcIiBhY2NlcHQ9e2FjY2VwdH0gY2xhc3NOYW1lPVwiaGlkZGVuXCJcbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBvbkZpbGUoZS50YXJnZXQuZmlsZXM/LlswXSB8fCBudWxsKX0gLz5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBpbnB1dFJlZi5jdXJyZW50Py5jbGljaygpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHAtNCByb3VuZGVkLXhsIGJvcmRlci0yIGJvcmRlci1kYXNoZWQgY3Vyc29yLXBvaW50ZXIgdHJhbnNpdGlvbi1hbGxcbiAgICAgICAgICAgICAgICAgICAgJHtmaWxlID8gZmlsbGVkW2NvbG9yXSA6ICdib3JkZXItc3RvbmUtMjAwIGhvdmVyOmJvcmRlci1zdG9uZS0zMDAgYmctc3RvbmUtNTAnfWB9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BwLTIuNSByb3VuZGVkLXhsIHNocmluay0wICR7ZmlsZSA/IGZpbGxlZFtjb2xvcl0uc3BsaXQoJyAnKVswXSA6ICdiZy13aGl0ZSBib3JkZXIgYm9yZGVyLXN0b25lLTIwMCd9YH0+XG4gICAgICAgICAgICAgICAgICAgIDxJY29uIHNpemU9ezE2fSBjbGFzc05hbWU9e2ZpbGUgPyBpY29uQ29sb3JbY29sb3JdIDogJ3RleHQtc3RvbmUtNDAwJ30gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT17YHRleHQtWzEycHhdIGZvbnQtYm9sZCAke2ZpbGUgPyBpY29uQ29sb3JbY29sb3JdIDogJ3RleHQtc3RvbmUtNTAwJ31gfT57bGFiZWx9PC9wPlxuICAgICAgICAgICAgICAgICAgICB7ZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LXN0b25lLTUwMCB0cnVuY2F0ZVwiPntmaWxlLm5hbWV9IMK3IHtmbXRTaXplKGZpbGUuc2l6ZSl9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgOiA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LXN0b25lLTQwMFwiPkRvc3lhIHNlw6dtZWsgacOnaW4gdMSxa2xhecSxbjwvcD5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIHtmaWxlID8gKFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtlID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgb25GaWxlKG51bGwpOyBpZiAoaW5wdXRSZWYuY3VycmVudCkgaW5wdXRSZWYuY3VycmVudC52YWx1ZSA9ICcnOyB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2hyaW5rLTAgcC0xIHJvdW5kZWQtbGcgdGV4dC1zdG9uZS00MDAgaG92ZXI6dGV4dC1yZWQtNTAwIGhvdmVyOmJnLXJlZC01MCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxYIHNpemU9ezEzfSAvPlxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICA8VXBsb2FkIHNpemU9ezE0fSBjbGFzc05hbWU9XCJ0ZXh0LXN0b25lLTMwMCBzaHJpbmstMFwiIC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG4vKiDilIDilIAgWcO8a2xlbWUgTW9kYWzEsSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmZ1bmN0aW9uIFVwbG9hZE1vZGFsKHsgb25DbG9zZSwgb25VcGxvYWRlZCwgb25BbmFseXNpc0RvbmUgfSkge1xuICAgIGNvbnN0IFtjaXppbUZpbGUsICAgc2V0Q2l6aW1GaWxlXSAgID0gdXNlU3RhdGUobnVsbCk7XG4gICAgY29uc3QgW25lc3RpbmdGaWxlLCBzZXROZXN0aW5nRmlsZV0gPSB1c2VTdGF0ZShudWxsKTtcbiAgICBjb25zdCBbdXBsb2FkaW5nLCAgIHNldFVwbG9hZGluZ10gICA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgICBjb25zdCBbcHJvZ3Jlc3MsICAgIHNldFByb2dyZXNzXSAgICA9IHVzZVN0YXRlKCcnKTtcbiAgICBjb25zdCBjaXppbVJlZiAgPSB1c2VSZWYobnVsbCk7XG4gICAgY29uc3QgbmVzdGluZ1JlZiA9IHVzZVJlZihudWxsKTtcblxuICAgIGNvbnN0IGNhblVwbG9hZCA9ICghIWNpemltRmlsZSB8fCAhIW5lc3RpbmdGaWxlKSAmJiAhdXBsb2FkaW5nO1xuXG4gICAgY29uc3QgaGFuZGxlVXBsb2FkID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoIWNhblVwbG9hZCkgcmV0dXJuO1xuICAgICAgICBzZXRVcGxvYWRpbmcodHJ1ZSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgY2l6aW1JZCAgID0gbnVsbDtcbiAgICAgICAgICAgIGxldCBuZXN0aW5nSWQgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoY2l6aW1GaWxlKSB7XG4gICAgICAgICAgICAgICAgc2V0UHJvZ3Jlc3MoJ1Rla25payDDp2l6aW0gecO8a2xlbml5b3LigKYnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmZCA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAgICAgICAgIGZkLmFwcGVuZCgnZmlsZScsIGNpemltRmlsZSk7XG4gICAgICAgICAgICAgICAgZmQuYXBwZW5kKCdrYXRlZ29yaScsICd0ZWtuaWtfcmVzaW0nKTtcbiAgICAgICAgICAgICAgICBmZC5hcHBlbmQoJ2NhZF90dXJ1JywgJ2NhZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlcyAgPSBhd2FpdCBmZXRjaCgnL2FwaS9hcmNoaXZlL2RpcmVjdC11cGxvYWQnLCB7IG1ldGhvZDogJ1BPU1QnLCBib2R5OiBmZCB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgICAgICAgICAgICBjaXppbUlkID0gZGF0YS5pZDtcbiAgICAgICAgICAgICAgICBpZiAoY2l6aW1JZCkgc3Vic2NyaWJlVG9Eb2NQcm9ncmVzcyhjaXppbUlkLCBjaXppbUZpbGUubmFtZSwgb25BbmFseXNpc0RvbmUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobmVzdGluZ0ZpbGUpIHtcbiAgICAgICAgICAgICAgICBzZXRQcm9ncmVzcygnTmVzdGluZyB5w7xrbGVuaXlvcuKApicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgICAgICAgICAgZmQuYXBwZW5kKCdmaWxlJywgbmVzdGluZ0ZpbGUpO1xuICAgICAgICAgICAgICAgIGZkLmFwcGVuZCgna2F0ZWdvcmknLCAndGVrbmlrX3Jlc2ltJyk7XG4gICAgICAgICAgICAgICAgZmQuYXBwZW5kKCdjYWRfdHVydScsICduZXN0aW5nJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzICA9IGF3YWl0IGZldGNoKCcvYXBpL2FyY2hpdmUvZGlyZWN0LXVwbG9hZCcsIHsgbWV0aG9kOiAnUE9TVCcsIGJvZHk6IGZkIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpO1xuICAgICAgICAgICAgICAgIG5lc3RpbmdJZCA9IGRhdGEuaWQ7XG4gICAgICAgICAgICAgICAgaWYgKG5lc3RpbmdJZCkgc3Vic2NyaWJlVG9Eb2NQcm9ncmVzcyhuZXN0aW5nSWQsIG5lc3RpbmdGaWxlLm5hbWUsIG9uQW5hbHlzaXNEb25lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNpemltSWQgJiYgbmVzdGluZ0lkKSB7XG4gICAgICAgICAgICAgICAgc2V0UHJvZ3Jlc3MoJ0Rvc3lhbGFyIGJhxJ9sYW7EsXlvcuKApicpO1xuICAgICAgICAgICAgICAgIGF3YWl0IGZldGNoKCcvYXBpL2FyY2hpdmUvbGluaycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgICAgICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHNvdXJjZV9pZDogY2l6aW1JZCwgdGFyZ2V0X2lkOiBuZXN0aW5nSWQsIGxpbmtfdHlwZTogJ25lc3RpbmcnIH0pLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvblVwbG9hZGVkKCk7XG4gICAgICAgICAgICBvbkNsb3NlKCk7XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgZmluYWxseSB7IHNldFVwbG9hZGluZyhmYWxzZSk7IHNldFByb2dyZXNzKCcnKTsgfVxuICAgIH07XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgei01MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBiZy1ibGFjay8zMCBiYWNrZHJvcC1ibHVyLXNtXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtMnhsIHNoYWRvdy0yeGwgYm9yZGVyIGJvcmRlci1zdG9uZS0yMDAgdy1bNTIwcHhdIGZsZXggZmxleC1jb2wgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBweC02IHB5LTQgYm9yZGVyLWIgYm9yZGVyLXN0b25lLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtMiByb3VuZGVkLXhsIGJnLVsjMzc4QUREXS8xMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPFVwbG9hZCBzaXplPXsxNn0gY2xhc3NOYW1lPVwidGV4dC1bIzM3OEFERF1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzE0cHhdIGZvbnQtYm9sZCB0ZXh0LXN0b25lLTgwMFwiPlRla25payBEb3N5YSBZw7xrbGU8L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LXN0b25lLTQwMFwiPlRla25payDDp2l6aW0gdmUvdmV5YSBuZXN0aW5nIHBsYW7EsW7EsSBiaXJsaWt0ZSB5w7xrbGV5aW48L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e29uQ2xvc2V9IGRpc2FibGVkPXt1cGxvYWRpbmd9IGNsYXNzTmFtZT1cInAtMS41IHJvdW5kZWQtbGcgdGV4dC1zdG9uZS00MDAgaG92ZXI6Ymctc3RvbmUtMTAwIGRpc2FibGVkOm9wYWNpdHktNDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxYIHNpemU9ezE0fSAvPlxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC02IGZsZXggZmxleC1jb2wgZ2FwLTNcIj5cbiAgICAgICAgICAgICAgICAgICAgPEZpbGVTbG90IGxhYmVsPVwiVGVrbmlrIMOHaXppbVwiIGNvbG9yPVwidmlvbGV0XCIgaWNvbj17Q3B1fVxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZT17Y2l6aW1GaWxlfSBvbkZpbGU9e3NldENpemltRmlsZX0gaW5wdXRSZWY9e2NpemltUmVmfSBhY2NlcHQ9XCIqXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPEZpbGVTbG90IGxhYmVsPVwiTmVzdGluZyBQbGFuxLFcIiBjb2xvcj1cIm9yYW5nZVwiIGljb249e1NjaXNzb3JzfVxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZT17bmVzdGluZ0ZpbGV9IG9uRmlsZT17c2V0TmVzdGluZ0ZpbGV9IGlucHV0UmVmPXtuZXN0aW5nUmVmfSBhY2NlcHQ9XCIqXCIgLz5cbiAgICAgICAgICAgICAgICAgICAge2NpemltRmlsZSAmJiBuZXN0aW5nRmlsZSAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTMgcHktMiBiZy1lbWVyYWxkLTUwIGJvcmRlciBib3JkZXItZW1lcmFsZC0yMDAgcm91bmRlZC1sZyB0ZXh0LVsxMXB4XSB0ZXh0LWVtZXJhbGQtNjAwIGZvbnQtbWVkaXVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPExpbmsyIHNpemU9ezEyfSAvPiDEsGtpIGRvc3lhIG90b21hdGlrIG9sYXJhayBiaXJiaXJpbmUgYmHEn2xhbmFjYWtcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICB7dXBsb2FkaW5nICYmIHByb2dyZXNzICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtMyBweS0yIGJnLVsjMzc4QUREXS81IGJvcmRlciBib3JkZXItWyMzNzhBRERdLzIwIHJvdW5kZWQtbGcgdGV4dC1bMTFweF0gdGV4dC1bIzM3OEFERF0gZm9udC1tZWRpdW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8TG9hZGVyMiBzaXplPXsxMn0gY2xhc3NOYW1lPVwiYW5pbWF0ZS1zcGluXCIgLz4ge3Byb2dyZXNzfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktZW5kIGdhcC0yIHB4LTYgcHktNCBib3JkZXItdCBib3JkZXItc3RvbmUtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17b25DbG9zZX0gZGlzYWJsZWQ9e3VwbG9hZGluZ30gY2xhc3NOYW1lPVwicHgtNCBweS0yIHRleHQtWzEycHhdIGZvbnQtc2VtaWJvbGQgdGV4dC1zdG9uZS01MDAgaG92ZXI6dGV4dC1zdG9uZS03MDAgZGlzYWJsZWQ6b3BhY2l0eS00MFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgxLBwdGFsXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVVcGxvYWR9XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17IWNhblVwbG9hZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtNSBweS0yIGJnLVsjMzc4QUREXSB0ZXh0LXdoaXRlIHRleHQtWzEycHhdIGZvbnQtYm9sZCByb3VuZGVkLXhsIGhvdmVyOmJnLVsjMmE2YWI4XSB0cmFuc2l0aW9uLWNvbG9ycyBkaXNhYmxlZDpvcGFjaXR5LTUwXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAge3VwbG9hZGluZyA/IDxMb2FkZXIyIHNpemU9ezEzfSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiA6IDxVcGxvYWQgc2l6ZT17MTN9IC8+fVxuICAgICAgICAgICAgICAgICAgICAgICAgWcO8a2xlXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG5cbi8qIOKUgOKUgCBEb3N5YSBCYcSfbGFudMSxIE1vZGFsxLEg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5mdW5jdGlvbiBMaW5rTW9kYWwoeyBzb3VyY2VJdGVtLCBsaW5rVHlwZSwgb25DbG9zZSwgb25MaW5rZWQgfSkge1xuICAgIGNvbnN0IFt1cGxvYWRpbmcsIHNldFVwbG9hZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gICAgY29uc3QgW3Byb2dyZXNzLCAgc2V0UHJvZ3Jlc3NdICA9IHVzZVN0YXRlKCcnKTtcbiAgICBjb25zdCBpbnB1dFJlZiA9IHVzZVJlZihudWxsKTtcblxuICAgIGNvbnN0IGlzVmlvbGV0ID0gbGlua1R5cGUgPT09ICdjYWQnO1xuICAgIGNvbnN0IGxhYmVsICAgID0gaXNWaW9sZXQgPyAnQ0FEIERvc3lhc8SxJyA6ICdOZXN0aW5nIERvc3lhc8SxJztcbiAgICBjb25zdCBjYWRUdXJ1ICA9IGlzVmlvbGV0ID8gJ2NhZCcgOiAnbmVzdGluZyc7XG4gICAgY29uc3QgSWNvbiAgICAgPSBpc1Zpb2xldCA/IENwdSA6IFNjaXNzb3JzO1xuICAgIGNvbnN0IHJpbmcgICAgID0gaXNWaW9sZXQgPyAnYm9yZGVyLXZpb2xldC0yMDAgYmctdmlvbGV0LTUwJyA6ICdib3JkZXItb3JhbmdlLTIwMCBiZy1vcmFuZ2UtNTAnO1xuICAgIGNvbnN0IGljb25DbHMgID0gaXNWaW9sZXQgPyAndGV4dC12aW9sZXQtNDAwJyA6ICd0ZXh0LW9yYW5nZS00MDAnO1xuXG4gICAgY29uc3QgaGFuZGxlRmlsZSA9IGFzeW5jIChmaWxlKSA9PiB7XG4gICAgICAgIGlmICghZmlsZSkgeyBvbkNsb3NlKCk7IHJldHVybjsgfVxuICAgICAgICBzZXRVcGxvYWRpbmcodHJ1ZSk7XG4gICAgICAgIHNldFByb2dyZXNzKCdZw7xrbGVuaXlvcuKApicpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgICAgIGZkLmFwcGVuZCgnZmlsZScsIGZpbGUpO1xuICAgICAgICAgICAgZmQuYXBwZW5kKCdrYXRlZ29yaScsICd0ZWtuaWtfcmVzaW0nKTtcbiAgICAgICAgICAgIGZkLmFwcGVuZCgnY2FkX3R1cnUnLCBjYWRUdXJ1KTtcbiAgICAgICAgICAgIGNvbnN0IHJlcyAgPSBhd2FpdCBmZXRjaCgnL2FwaS9hcmNoaXZlL2RpcmVjdC11cGxvYWQnLCB7IG1ldGhvZDogJ1BPU1QnLCBib2R5OiBmZCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpO1xuICAgICAgICAgICAgaWYgKGRhdGEuaWQpIHN1YnNjcmliZVRvRG9jUHJvZ3Jlc3MoZGF0YS5pZCwgZmlsZS5uYW1lKTtcblxuICAgICAgICAgICAgc2V0UHJvZ3Jlc3MoJ0JhxJ9sYW7EsXlvcuKApicpO1xuICAgICAgICAgICAgYXdhaXQgZmV0Y2goJy9hcGkvYXJjaGl2ZS9saW5rJywge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogICdQT1NUJyxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgICAgICAgICAgICBib2R5OiAgICBKU09OLnN0cmluZ2lmeSh7IHNvdXJjZV9pZDogc291cmNlSXRlbS5pZCwgdGFyZ2V0X2lkOiBkYXRhLmlkLCBsaW5rX3R5cGU6IGxpbmtUeXBlIH0pLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBvbkxpbmtlZCgpO1xuICAgICAgICAgICAgb25DbG9zZSgpO1xuICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIGZpbmFsbHkgeyBzZXRVcGxvYWRpbmcoZmFsc2UpOyBzZXRQcm9ncmVzcygnJyk7IH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotNTAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYmctYmxhY2svMzAgYmFja2Ryb3AtYmx1ci1zbVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLTJ4bCBzaGFkb3ctMnhsIGJvcmRlciBib3JkZXItc3RvbmUtMjAwIHctWzM4MHB4XSBmbGV4IGZsZXgtY29sIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCByZWY9e2lucHV0UmVmfSB0eXBlPVwiZmlsZVwiIGFjY2VwdD1cIipcIiBjbGFzc05hbWU9XCJoaWRkZW5cIlxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBoYW5kbGVGaWxlKGUudGFyZ2V0LmZpbGVzPy5bMF0gfHwgbnVsbCl9IC8+XG5cbiAgICAgICAgICAgICAgICB7LyogQmHFn2zEsWsgKi99XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBweC01IHB5LTQgYm9yZGVyLWIgYm9yZGVyLXN0b25lLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHAtMiByb3VuZGVkLXhsICR7aXNWaW9sZXQgPyAnYmctdmlvbGV0LTUwJyA6ICdiZy1vcmFuZ2UtNTAnfWB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPEljb24gc2l6ZT17MTZ9IGNsYXNzTmFtZT17aWNvbkNsc30gLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIG1pbi13LTBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEzcHhdIGZvbnQtYm9sZCB0ZXh0LXN0b25lLTgwMFwiPntsYWJlbH0gQmHEn2xhPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zdG9uZS00MDAgdHJ1bmNhdGVcIj7ihpAge3NvdXJjZUl0ZW0uZmlsZW5hbWV9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvbkNsb3NlfSBkaXNhYmxlZD17dXBsb2FkaW5nfSBjbGFzc05hbWU9XCJwLTEuNSByb3VuZGVkLWxnIHRleHQtc3RvbmUtNDAwIGhvdmVyOmJnLXN0b25lLTEwMCBkaXNhYmxlZDpvcGFjaXR5LTQwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8WCBzaXplPXsxNH0gLz5cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICB7LyogxLDDp2VyaWsgKi99XG4gICAgICAgICAgICAgICAge3VwbG9hZGluZyA/IChcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyBweS0xMCB0ZXh0LVsxMnB4XSB0ZXh0LXN0b25lLTUwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPExvYWRlcjIgc2l6ZT17MTh9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpbiB0ZXh0LVsjMzc4QUREXVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICB7cHJvZ3Jlc3N9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGlucHV0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMyBweS04IHB4LTYgY3Vyc29yLXBvaW50ZXIgaG92ZXI6Ymctc3RvbmUtNTAgdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHAtNCByb3VuZGVkLTJ4bCBib3JkZXItMiBib3JkZXItZGFzaGVkICR7cmluZ31gfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VXBsb2FkIHNpemU9ezI2fSBjbGFzc05hbWU9e2ljb25DbHN9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMnB4XSBmb250LWJvbGQgdGV4dC1zdG9uZS03MDBcIj5Eb3N5YSBzZcOnbWVrIGnDp2luIHTEsWtsYXnEsW48L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zdG9uZS00MDAgbXQtMC41XCI+UE5HLCBKUEcsIFBERiwgRFdHLCBEWEYsIFNUUC9TVEVQIGRlc3Rla2xlbmlyPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuLyog4pSA4pSAIEJhxJ9sxLEgZG9zeWEgZHVydW0gZ8O2c3Rlcmdlc2kg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5mdW5jdGlvbiBMaW5rU3RhdHVzKHsgaXRlbSwgb25VbmxpbmssIG9uU3RhcnRMaW5rIH0pIHtcbiAgICBjb25zdCBiYWdsaSAgICAgPSBpdGVtLm1ldGE/LmJhZ2xpX2Rvc3lhbGFyIHx8IHt9O1xuICAgIGNvbnN0IGNhZElkICAgICA9IGJhZ2xpLmNhZDtcbiAgICBjb25zdCBuZXN0aW5nSWQgPSBiYWdsaS5uZXN0aW5nO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgey8qIENBRCBiYWRnZSAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JvdXAvYmFkZ2UgcmVsYXRpdmUgZmxleCBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICB7Y2FkSWQgPyAoXG4gICAgICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBweC0xLjUgcHktMC41IHRleHQtWzlweF0gZm9udC1ib2xkIHJvdW5kZWQgYmctdmlvbGV0LTEwMCB0ZXh0LXZpb2xldC03MDAgYm9yZGVyIGJvcmRlci12aW9sZXQtMzAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPENwdSBzaXplPXs3fSAvPiBDQUQgPENoZWNrQ2lyY2xlMiBzaXplPXs3fSBjbGFzc05hbWU9XCJ0ZXh0LXZpb2xldC01MDBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2UgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBvblVubGluayhpdGVtLmlkLCAnY2FkJyk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJCYcSfbGFudMSxecSxIGthbGTEsXJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFic29sdXRlIC10b3AtMS41IC1yaWdodC0xLjUgaGlkZGVuIGdyb3VwLWhvdmVyL2JhZGdlOmZsZXggdy0zLjUgaC0zLjUgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGJnLXJlZC01MDAgdGV4dC13aGl0ZSByb3VuZGVkLWZ1bGwgc2hhZG93XCJcbiAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8WCBzaXplPXs2fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2UgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBvblN0YXJ0TGluayhpdGVtLCAnY2FkJyk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkNBRCBkb3N5YXPEsSBiYcSfbGFcIlxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMS41IHB5LTAuNSB0ZXh0LVs5cHhdIGZvbnQtYm9sZCByb3VuZGVkIGJnLXN0b25lLTUwIHRleHQtc3RvbmUtMzAwIGJvcmRlciBib3JkZXItZGFzaGVkIGJvcmRlci1zdG9uZS0yMDAgaG92ZXI6Ym9yZGVyLXZpb2xldC0zMDAgaG92ZXI6dGV4dC12aW9sZXQtNDAwIGhvdmVyOmJnLXZpb2xldC01MCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxDcHUgc2l6ZT17N30gLz4gQ0FEXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgey8qIE5FUyBiYWRnZSAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JvdXAvYmFkZ2UgcmVsYXRpdmUgZmxleCBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICB7bmVzdGluZ0lkID8gKFxuICAgICAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMS41IHB5LTAuNSB0ZXh0LVs5cHhdIGZvbnQtYm9sZCByb3VuZGVkIGJnLW9yYW5nZS0xMDAgdGV4dC1vcmFuZ2UtNjAwIGJvcmRlciBib3JkZXItb3JhbmdlLTMwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxTY2lzc29ycyBzaXplPXs3fSAvPiBORVMgPENoZWNrQ2lyY2xlMiBzaXplPXs3fSBjbGFzc05hbWU9XCJ0ZXh0LW9yYW5nZS01MDBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2UgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBvblVubGluayhpdGVtLmlkLCAnbmVzdGluZycpOyB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiQmHEn2xhbnTEsXnEsSBrYWxkxLFyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTEuNSAtcmlnaHQtMS41IGhpZGRlbiBncm91cC1ob3Zlci9iYWRnZTpmbGV4IHctMy41IGgtMy41IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBiZy1yZWQtNTAwIHRleHQtd2hpdGUgcm91bmRlZC1mdWxsIHNoYWRvd1wiXG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFggc2l6ZT17Nn0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtlID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgb25TdGFydExpbmsoaXRlbSwgJ25lc3RpbmcnKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiTmVzdGluZyBkb3N5YXPEsSBiYcSfbGFcIlxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMS41IHB5LTAuNSB0ZXh0LVs5cHhdIGZvbnQtYm9sZCByb3VuZGVkIGJnLXN0b25lLTUwIHRleHQtc3RvbmUtMzAwIGJvcmRlciBib3JkZXItZGFzaGVkIGJvcmRlci1zdG9uZS0yMDAgaG92ZXI6Ym9yZGVyLW9yYW5nZS0zMDAgaG92ZXI6dGV4dC1vcmFuZ2UtNDAwIGhvdmVyOmJnLW9yYW5nZS01MCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxTY2lzc29ycyBzaXplPXs3fSAvPiBORVNcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG4vKiDilIDilIAgRXhjZWwgaW5kaXJtZSB5YXJkxLFtY8SxbGFyxLEg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5cbmZ1bmN0aW9uIF9zZXRDb2xXaWR0aHMod3MsIHdpZHRocykge1xuICAgIHdzWychY29scyddID0gd2lkdGhzLm1hcCh3ID0+ICh7IHdjaDogdyB9KSk7XG59XG5cbmZ1bmN0aW9uIF9idWlsZFRla25pa1NoZWV0KHZhKSB7XG4gICAgY29uc3QgYmIgICA9IHZhPy5iYXNsaWtfYmxva3UgfHwge307XG4gICAgY29uc3Qgcm93cyA9IFtdO1xuXG4gICAgLyog4pSA4pSAIEJBxZ5MSUsgQkxPxJ5VIOKUgOKUgCAqL1xuICAgIHJvd3MucHVzaChbJ0JBxZ5MSUsgQkxPxJ5VJywgJyddKTtcbiAgICBbXG4gICAgICAgIFsnw4dpemltIE5vJywgICAgICBiYi5jaXppbV9udW1hcmFzaV0sXG4gICAgICAgIFsnS2ltbGlrIE5vJywgICAgIGJiLmtpbWxpa19udW1hcmFzaV0sXG4gICAgICAgIFsnQmHFn2zEsWsnLCAgICAgICAgYmIuYmFzbGlrXSxcbiAgICAgICAgWydGaXJtYScsICAgICAgICAgYmIuZmlybWFdLFxuICAgICAgICBbJ1Byb2plJywgICAgICAgICBiYi5wcm9qZV0sXG4gICAgICAgIFsnUmV2aXp5b24nLCAgICAgIGJiLnJldml6eW9uXSxcbiAgICAgICAgWyfDlmzDp2VrJywgICAgICAgICBiYi5vbGNla10sXG4gICAgICAgIFsnVGFyaWgnLCAgICAgICAgIGJiLnRhcmloXSxcbiAgICAgICAgWyfDh2l6ZW4nLCAgICAgICAgIGJiLmNpemVuXSxcbiAgICAgICAgWydPbmF5bGF5YW4nLCAgICAgYmIub25heWxheWFuXSxcbiAgICAgICAgWydLb250cm9sIEVkZW4nLCAgYmIua29udHJvbF9lZGVuXSxcbiAgICAgICAgWydNYWx6ZW1lJywgICAgICAgYmIubWFsemVtZV0sXG4gICAgICAgIFsnWcO8emV5IMSwxZ9sZW1pJywgIGJiLnl1emV5X2lzbGVtXSxcbiAgICAgICAgWydTZXJ0bGlrJywgICAgICAgYmIuc2VydGxpa10sXG4gICAgICAgIFsnQcSfxLFybMSxaycsICAgICAgIGJiLmFnaXJsaWtdLFxuICAgICAgICBbJ0JpcmltJywgICAgICAgICBiYi5iaXJpbV0sXG4gICAgICAgIFsnRm9ybWF0JywgICAgICAgIGJiLmJsYXR0X2Zvcm1hdF0sXG4gICAgICAgIFsnU2F5ZmEnLCAgICAgICAgIGJiLnNheWZhXSxcbiAgICBdLmZvckVhY2goKFtrLCB2XSkgPT4geyBpZiAodikgcm93cy5wdXNoKFtrLCBTdHJpbmcodildKTsgfSk7XG5cbiAgICAvKiDilIDilIAgUEFSw4dBIEzEsFNURVPEsCDilIDilIAgKi9cbiAgICByb3dzLnB1c2goW10pO1xuICAgIHJvd3MucHVzaChbJ1BBUsOHQSBMxLBTVEVTxLAnLCAnJywgJycsICcnLCAnJywgJyddKTtcbiAgICByb3dzLnB1c2goWydQb3onLCAnQWRldCcsICfDh2l6aW0gTm8nLCAnTWFsemVtZScsICdZYXLEsSBNYW11bCcsICdBw6fEsWtsYW1hJ10pO1xuICAgICh2YT8ucGFyY2FfbGlzdGVzaSB8fCBbXSkuZm9yRWFjaChwID0+IHJvd3MucHVzaChbXG4gICAgICAgIHAucG96IHx8ICcnLCBwLmFkZXQgfHwgJycsIHAuY2l6aW1fbm8gfHwgJycsXG4gICAgICAgIHAubWFsemVtZSB8fCAnJywgcC55YXJpbV9tYW11bCB8fCAnJywgcC5hY2lrbGFtYSB8fCAnJyxcbiAgICBdKSk7XG5cbiAgICAvKiDilIDilIAgw5ZMw4fDnExFUiDilIDilIAgKi9cbiAgICBpZiAodmE/Lm9sY3VsYXI/Lmxlbmd0aCkge1xuICAgICAgICByb3dzLnB1c2goW10pOyByb3dzLnB1c2goWyfDlkzDh8OcTEVSJywgJycsICcnLCAnJywgJyddKTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YS5vbGN1bGFyWzBdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcm93cy5wdXNoKFsnRXRpa2V0JywgJ0RlxJ9lcicsICdCaXJpbScsICdUb2xlcmFucycsICdBw6fEsWtsYW1hJ10pO1xuICAgICAgICAgICAgdmEub2xjdWxhci5mb3JFYWNoKG8gPT4gcm93cy5wdXNoKFtcbiAgICAgICAgICAgICAgICBvLmV0aWtldCB8fCAnJywgby5kZWdlciB8fCAnJywgby5iaXJpbSB8fCAnbW0nLCBvLnRvbGVyYW5zIHx8ICcnLCBvLmFjaWtsYW1hIHx8ICcnLFxuICAgICAgICAgICAgXSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm93cy5wdXNoKFsnw5Zsw6fDvCddKTsgdmEub2xjdWxhci5mb3JFYWNoKG8gPT4gcm93cy5wdXNoKFtTdHJpbmcobyldKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiDilIDilIAgVE9MRVJBTlNMQVIg4pSA4pSAICovXG4gICAgaWYgKHZhPy50b2xlcmFuc2xhcj8ubGVuZ3RoKSB7XG4gICAgICAgIHJvd3MucHVzaChbXSk7IHJvd3MucHVzaChbJ1RPTEVSQU5TTEFSJywgJycsICcnXSk7XG4gICAgICAgIGlmICh0eXBlb2YgdmEudG9sZXJhbnNsYXJbMF0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByb3dzLnB1c2goWydUaXAnLCAnRGXEn2VyJywgJ0HDp8Sxa2xhbWEnXSk7XG4gICAgICAgICAgICB2YS50b2xlcmFuc2xhci5mb3JFYWNoKHQgPT4gcm93cy5wdXNoKFt0LnRpcCB8fCAnJywgdC5kZWdlciB8fCAnJywgdC5hY2lrbGFtYSB8fCAnJ10pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvd3MucHVzaChbJ1RvbGVyYW5zJ10pOyB2YS50b2xlcmFuc2xhci5mb3JFYWNoKHQgPT4gcm93cy5wdXNoKFtTdHJpbmcodCldKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiDilIDilIAgxLDFnkxFTSBTSVJBU0kg4pSA4pSAICovXG4gICAgaWYgKHZhPy5pc2xlbV9zaXJhc2k/Lmxlbmd0aCkge1xuICAgICAgICByb3dzLnB1c2goW10pOyByb3dzLnB1c2goWyfEsMWeTEVNIFNJUkFTSScsICcnLCAnJ10pO1xuICAgICAgICBpZiAodHlwZW9mIHZhLmlzbGVtX3NpcmFzaVswXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJvd3MucHVzaChbJ1PEsXJhJywgJ8SwxZ9sZW0nLCAnQcOnxLFrbGFtYSddKTtcbiAgICAgICAgICAgIHZhLmlzbGVtX3NpcmFzaS5mb3JFYWNoKHMgPT4gcm93cy5wdXNoKFtzLnNpcmEgfHwgJycsIHMuaXNsZW0gfHwgJycsIHMuYWNpa2xhbWEgfHwgJyddKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByb3dzLnB1c2goWydTxLFyYScsICfEsMWfbGVtJ10pO1xuICAgICAgICAgICAgdmEuaXNsZW1fc2lyYXNpLmZvckVhY2goKHMsIGkpID0+IHJvd3MucHVzaChbaSArIDEsIFN0cmluZyhzKV0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qIOKUgOKUgCBOT1RMQVIg4pSA4pSAICovXG4gICAgaWYgKHZhPy5ub3RsYXI/Lmxlbmd0aCkge1xuICAgICAgICByb3dzLnB1c2goW10pOyByb3dzLnB1c2goWydOT1RMQVInXSk7XG4gICAgICAgIHZhLm5vdGxhci5mb3JFYWNoKG4gPT4gcm93cy5wdXNoKFtTdHJpbmcobildKSk7XG4gICAgfVxuXG4gICAgLyog4pSA4pSAIEdFTkVMIE1FVMSwTiDilIDilIAgKi9cbiAgICBpZiAodmE/LmdlbmVsX21ldGluKSB7IHJvd3MucHVzaChbXSk7IHJvd3MucHVzaChbJ0dFTkVMIE1FVMSwTicsIFN0cmluZyh2YS5nZW5lbF9tZXRpbildKTsgfVxuXG4gICAgY29uc3Qgd3MgPSBYTFNYLnV0aWxzLmFvYV90b19zaGVldChyb3dzKTtcbiAgICBfc2V0Q29sV2lkdGhzKHdzLCBbMjIsIDQwLCAxOCwgMTgsIDIyLCA0MF0pO1xuICAgIHJldHVybiB3cztcbn1cblxuZnVuY3Rpb24gX2J1aWxkTmVzdGluZ1NoZWV0KHZhKSB7XG4gICAgY29uc3Qgcm93cyA9IFtdO1xuXG4gICAgLyog4pSA4pSAIEdFTkVMIELEsExHxLBMRVIg4pSA4pSAICovXG4gICAgcm93cy5wdXNoKFsnR0VORUwgQsSwTEfEsExFUicsICcnXSk7XG4gICAgW1xuICAgICAgICBbJ1Byb2dyYW0gQWTEsScsICAgIHZhPy5wcm9ncmFtX2FkaV0sXG4gICAgICAgIFsnTWFsemVtZSBObycsICAgICB2YT8ubWFsemVtZV9udW1hcmFzaV0sXG4gICAgICAgIFsnTWFsemVtZScsICAgICAgICB2YT8ubWFsemVtZV0sXG4gICAgICAgIFsnS2FsxLFubMSxaycsICAgICAgIHZhPy5rYWxpbmxpa10sXG4gICAgICAgIFsnTGV2aGEgQm95dXR1JywgICB2YT8ubGV2aGFfYm95dXR1XSxcbiAgICAgICAgWydUb3BsYW0gUGFyw6dhJywgICB2YT8udG9wbGFtX3BhcmNhX2FkZWRpXSxcbiAgICAgICAgWydLdWxsYW7EsW0gT3JhbsSxJywgdmE/Lmt1bGxhbmltX29yYW5pXSxcbiAgICAgICAgWydGaXJlIE9yYW7EsScsICAgICB2YT8uZmlyZV9vcmFuaV0sXG4gICAgXS5mb3JFYWNoKChbaywgdl0pID0+IHsgaWYgKHYpIHJvd3MucHVzaChbaywgU3RyaW5nKHYpXSk7IH0pO1xuXG4gICAgLyog4pSA4pSAIFlBUElMQUNBSyDEsMWeTEVNTEVSIOKUgOKUgCAqL1xuICAgIGlmICh2YT8uaXNsZW1sZXI/Lmxlbmd0aCkge1xuICAgICAgICByb3dzLnB1c2goW10pOyByb3dzLnB1c2goWydZQVBJTEFDQUsgxLDFnkxFTUxFUiddKTtcbiAgICAgICAgdmEuaXNsZW1sZXIuZm9yRWFjaChpID0+IHJvd3MucHVzaChbU3RyaW5nKGkpXSkpO1xuICAgIH1cblxuICAgIC8qIOKUgOKUgCBQQVLDh0EgTMSwU1RFU8SwIOKUgOKUgCAqL1xuICAgIHJvd3MucHVzaChbXSk7XG4gICAgcm93cy5wdXNoKFsnUEFSw4dBIEzEsFNURVPEsCcsICcnLCAnJywgJyddKTtcbiAgICByb3dzLnB1c2goWydQYXLDp2EgQWTEsScsICdBZGV0JywgJ01hbHplbWUnLCAnS2FsxLFubMSxayddKTtcbiAgICAodmE/LnBhcmNhX2xpc3Rlc2kgfHwgW10pLmZvckVhY2gocCA9PiByb3dzLnB1c2goW1xuICAgICAgICBwLnBhcmNhX2FkaSB8fCAnJywgcC5hZGV0IHx8ICcnLCBwLm1hbHplbWUgfHwgJycsIHAua2FsaW5saWsgfHwgJycsXG4gICAgXSkpO1xuXG4gICAgLyog4pSA4pSAIE5PVExBUiDilIDilIAgKi9cbiAgICBpZiAodmE/Lm5vdGxhcj8ubGVuZ3RoKSB7XG4gICAgICAgIHJvd3MucHVzaChbXSk7IHJvd3MucHVzaChbJ05PVExBUiddKTtcbiAgICAgICAgdmEubm90bGFyLmZvckVhY2gobiA9PiByb3dzLnB1c2goW1N0cmluZyhuKV0pKTtcbiAgICB9XG5cbiAgICAvKiDilIDilIAgR0VORUwgTUVUxLBOIOKUgOKUgCAqL1xuICAgIGlmICh2YT8uZ2VuZWxfbWV0aW4pIHsgcm93cy5wdXNoKFtdKTsgcm93cy5wdXNoKFsnR0VORUwgTUVUxLBOJywgU3RyaW5nKHZhLmdlbmVsX21ldGluKV0pOyB9XG5cbiAgICBjb25zdCB3cyA9IFhMU1gudXRpbHMuYW9hX3RvX3NoZWV0KHJvd3MpO1xuICAgIF9zZXRDb2xXaWR0aHMod3MsIFsyOCwgMTIsIDIwLCAxMl0pO1xuICAgIHJldHVybiB3cztcbn1cblxuZnVuY3Rpb24gZG93bmxvYWRFeGNlbChpdGVtLCBsaW5rZWRJdGVtKSB7XG4gICAgY29uc3Qgd2IgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KCk7XG4gICAgY29uc3QgdmEgID0gaXRlbS5tZXRhPy52aXNpb25fYW5hbHlzaXM7XG4gICAgY29uc3QgbHZhID0gbGlua2VkSXRlbT8ubWV0YT8udmlzaW9uX2FuYWx5c2lzO1xuXG4gICAgaWYgKHZhPy5pbWFnZV90eXBlID09PSAndGVrbmlrX3Jlc2ltJykge1xuICAgICAgICBYTFNYLnV0aWxzLmJvb2tfYXBwZW5kX3NoZWV0KHdiLCBfYnVpbGRUZWtuaWtTaGVldCh2YSksICdUZWtuaWsgUmVzaW0nKTtcbiAgICAgICAgaWYgKGx2YT8uaW1hZ2VfdHlwZSA9PT0gJ25lc3RpbmcnKVxuICAgICAgICAgICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3YiwgX2J1aWxkTmVzdGluZ1NoZWV0KGx2YSksICdOZXN0aW5nJyk7XG4gICAgfSBlbHNlIGlmICh2YT8uaW1hZ2VfdHlwZSA9PT0gJ25lc3RpbmcnKSB7XG4gICAgICAgIFhMU1gudXRpbHMuYm9va19hcHBlbmRfc2hlZXQod2IsIF9idWlsZE5lc3RpbmdTaGVldCh2YSksICdOZXN0aW5nJyk7XG4gICAgICAgIGlmIChsdmE/LmltYWdlX3R5cGUgPT09ICd0ZWtuaWtfcmVzaW0nKVxuICAgICAgICAgICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3YiwgX2J1aWxkVGVrbmlrU2hlZXQobHZhKSwgJ1Rla25payBSZXNpbScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIFhMU1gudXRpbHMuYm9va19hcHBlbmRfc2hlZXQod2IsIFhMU1gudXRpbHMuYW9hX3RvX3NoZWV0KFtbJ0FuYWxpeiB2ZXJpc2kgeW9rJ11dKSwgJ1ZlcmknKTtcbiAgICB9XG4gICAgY29uc3QgbmFtZSA9IGl0ZW0uZmlsZW5hbWUucmVwbGFjZSgvXFwuW14uXSskLywgJycpICsgJ19hbmFsaXoueGxzeCc7XG4gICAgWExTWC53cml0ZUZpbGUod2IsIG5hbWUpO1xufVxuXG4vKiDilIDilIAgVmVyaSB0YWJsbyBtb2RhbGkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5mdW5jdGlvbiBEYXRhVGFibGVNb2RhbCh7IGl0ZW0sIGFsbEl0ZW1zLCBvbkNsb3NlIH0pIHtcbiAgICBjb25zdCB2YSAgICAgICA9IGl0ZW0ubWV0YT8udmlzaW9uX2FuYWx5c2lzO1xuICAgIGNvbnN0IGJhZ2xpICAgID0gaXRlbS5tZXRhPy5iYWdsaV9kb3N5YWxhciB8fCB7fTtcblxuICAgIC8vIEJhxJ9sxLEgZG9zeWF5xLEgYnVsIChuZXN0aW5nIHZleWEgY2l6aW0pXG4gICAgY29uc3QgbGlua2VkSWQgPSBiYWdsaS5uZXN0aW5nIHx8IGJhZ2xpLmNhZCB8fCBiYWdsaS5jaXppbTtcbiAgICBjb25zdCBsaW5rZWRJdGVtID0gbGlua2VkSWQgPyAoYWxsSXRlbXMgfHwgW10pLmZpbmQoaSA9PiBpLmlkID09PSBsaW5rZWRJZCkgOiBudWxsO1xuICAgIGNvbnN0IGx2YSA9IGxpbmtlZEl0ZW0/Lm1ldGE/LnZpc2lvbl9hbmFseXNpcztcblxuICAgIC8vIEhhbmdpIHNla21lIGJhxZ90YSBhw6fEsWxzxLFuXG4gICAgY29uc3QgaW5pdFRhYiA9IHZhPy5pbWFnZV90eXBlID09PSAnbmVzdGluZycgPyAnbmVzdGluZycgOiAndGVrbmlrJztcbiAgICBjb25zdCBbdGFiLCBzZXRUYWJdID0gdXNlU3RhdGUoaW5pdFRhYik7XG5cbiAgICBjb25zdCBoYXNUZWtuaWsgID0gdmE/LmltYWdlX3R5cGUgPT09ICd0ZWtuaWtfcmVzaW0nIHx8IGx2YT8uaW1hZ2VfdHlwZSA9PT0gJ3Rla25pa19yZXNpbSc7XG4gICAgY29uc3QgaGFzTmVzdGluZyA9IHZhPy5pbWFnZV90eXBlID09PSAnbmVzdGluZycgICAgICB8fCBsdmE/LmltYWdlX3R5cGUgPT09ICduZXN0aW5nJztcblxuICAgIGNvbnN0IGFjdGl2ZVZhID0gdGFiID09PSAndGVrbmlrJ1xuICAgICAgICA/ICh2YT8uaW1hZ2VfdHlwZSA9PT0gJ3Rla25pa19yZXNpbScgPyB2YSA6IGx2YSlcbiAgICAgICAgOiAodmE/LmltYWdlX3R5cGUgPT09ICduZXN0aW5nJyAgICAgID8gdmEgOiBsdmEpO1xuXG4gICAgY29uc3QgaGFzQW55ID0gaGFzVGVrbmlrIHx8IGhhc05lc3Rpbmc7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgei01MCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBiZy1ibGFjay80MCBiYWNrZHJvcC1ibHVyLXNtIHAtNlwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLTJ4bCBzaGFkb3ctMnhsIGJvcmRlciBib3JkZXItc3RvbmUtMjAwIGZsZXggZmxleC1jb2wgb3ZlcmZsb3ctaGlkZGVuXCJcbiAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGg6ICc4NjBweCcsIGhlaWdodDogJzg4dmgnIH19PlxuXG4gICAgICAgICAgICAgICAgey8qIOKUgOKUgCBCYcWfbMSxayDilIDilIAgKi99XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBweC02IHB5LTQgYm9yZGVyLWIgYm9yZGVyLXN0b25lLTEwMCBzaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtMiByb3VuZGVkLXhsIGJnLVsjMzc4QUREXS8xMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPFRhYmxlMiBzaXplPXsxNX0gY2xhc3NOYW1lPVwidGV4dC1bIzM3OEFERF1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgbWluLXctMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTNweF0gZm9udC1ib2xkIHRleHQtc3RvbmUtODAwIHRydW5jYXRlXCI+e2l0ZW0uZmlsZW5hbWV9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zdG9uZS00MDBcIj5ZYXDEsXNhbCBhbmFsaXogdmVyaXNpPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICB7LyogU2VrbWUgZ2XDp2nFnyAqL31cbiAgICAgICAgICAgICAgICAgICAgeyhoYXNUZWtuaWsgJiYgaGFzTmVzdGluZykgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBiZy1zdG9uZS0xMDAgcm91bmRlZC14bCBwLTAuNSBnYXAtMC41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUYWIoJ3Rla25paycpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTMgcHktMS41IHJvdW5kZWQtbGcgdGV4dC1bMTFweF0gZm9udC1ib2xkIHRyYW5zaXRpb24tYWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3RhYiA9PT0gJ3Rla25paycgPyAnYmctd2hpdGUgc2hhZG93IHRleHQtdmlvbGV0LTYwMCcgOiAndGV4dC1zdG9uZS00MDAgaG92ZXI6dGV4dC1zdG9uZS02MDAnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Q3B1IHNpemU9ezExfSAvPiBUZWtuaWsgw4dpemltXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUYWIoJ25lc3RpbmcnKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC0zIHB5LTEuNSByb3VuZGVkLWxnIHRleHQtWzExcHhdIGZvbnQtYm9sZCB0cmFuc2l0aW9uLWFsbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHt0YWIgPT09ICduZXN0aW5nJyA/ICdiZy13aGl0ZSBzaGFkb3cgdGV4dC1vcmFuZ2UtNTAwJyA6ICd0ZXh0LXN0b25lLTQwMCBob3Zlcjp0ZXh0LXN0b25lLTYwMCd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxTY2lzc29ycyBzaXplPXsxMX0gLz4gTmVzdGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtvbkNsb3NlfSBjbGFzc05hbWU9XCJwLTEuNSByb3VuZGVkLWxnIHRleHQtc3RvbmUtNDAwIGhvdmVyOmJnLXN0b25lLTEwMCB0cmFuc2l0aW9uLWNvbG9ycyBtbC0xXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8WCBzaXplPXsxNX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICB7Lyog4pSA4pSAIMSww6dlcmlrIOKUgOKUgCAqL31cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy1oaWRkZW4gZmxleCBmbGV4LWNvbCBtaW4taC0wXCI+XG4gICAgICAgICAgICAgICAgICAgIHshaGFzQW55ID8gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgb3ZlcmZsb3cteS1hdXRvIG1pbmltYWwtc2Nyb2xsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPEVtcHR5QW5hbHlzaXNTdGF0ZSBzdGF0dXM9e2l0ZW0ubWV0YT8udHJhbnNjcmlwdGlvbl9zdGF0dXN9IHZhPXt2YX0gdmlzaW9uRXJyb3I9e2l0ZW0ubWV0YT8udmlzaW9uX2Vycm9yfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICkgOiB0YWIgPT09ICd0ZWtuaWsnID8gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPFRla25pa1RhYmxlIHZhPXthY3RpdmVWYX0gLz5cbiAgICAgICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxOZXN0aW5nVGFibGUgdmE9e2FjdGl2ZVZhfSAvPlxuICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgey8qIOKUgOKUgCBBbHQg4pSA4pSAICovfVxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0zIHB4LTYgcHktMy41IGJvcmRlci10IGJvcmRlci1zdG9uZS0xMDAgc2hyaW5rLTBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gZG93bmxvYWRFeGNlbChpdGVtLCBsaW5rZWRJdGVtKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshaGFzQW55fVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC00IHB5LTIgYmctZW1lcmFsZC01MDAgdGV4dC13aGl0ZSB0ZXh0LVsxMnB4XSBmb250LWJvbGQgcm91bmRlZC14bCBob3ZlcjpiZy1lbWVyYWxkLTYwMCB0cmFuc2l0aW9uLWNvbG9ycyBkaXNhYmxlZDpvcGFjaXR5LTQwXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgPERvd25sb2FkIHNpemU9ezEzfSAvPiBFeGNlbCDEsG5kaXJcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17b25DbG9zZX0gY2xhc3NOYW1lPVwicHgtNCBweS0yIHRleHQtWzEycHhdIGZvbnQtc2VtaWJvbGQgdGV4dC1zdG9uZS01MDAgaG92ZXI6dGV4dC1zdG9uZS03MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIEthcGF0XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG5cbi8qIOKUgOKUgCBBbmFsaXogYm/FnyBkdXJ1bSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmZ1bmN0aW9uIEVtcHR5QW5hbHlzaXNTdGF0ZSh7IHN0YXR1cywgdmEsIHZpc2lvbkVycm9yIH0pIHtcbiAgICBjb25zdCBbY2ZnLCBzZXRDZmddID0gdXNlU3RhdGUobnVsbCk7XG5cbiAgICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgICAgICBpZiAoc3RhdHVzID09PSAnZG9uZScgJiYgIXZhKSB7XG4gICAgICAgICAgICBmZXRjaCgnL2FwaS9hcmNoaXZlL2NoZWNrLXZpc2lvbi1jb25maWcnKVxuICAgICAgICAgICAgICAgIC50aGVuKHIgPT4gci5qc29uKCkpXG4gICAgICAgICAgICAgICAgLnRoZW4oc2V0Q2ZnKVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgIH1cbiAgICB9LCBbc3RhdHVzLCB2YV0pO1xuXG4gICAgaWYgKHN0YXR1cyA9PT0gJ3Byb2Nlc3NpbmcnKSByZXR1cm4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGgtNDggZ2FwLTMgdGV4dC1bIzM3OEFERF1cIj5cbiAgICAgICAgICAgIDxMb2FkZXIyIHNpemU9ezMwfSBzdHJva2VXaWR0aD17MS41fSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTJweF0gZm9udC1zZW1pYm9sZFwiPlZpc2lvbiBBSSBhbmFsaXogZWRpeW9y4oCmPC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xuXG4gICAgaWYgKHN0YXR1cyA9PT0gJ2RvbmUnICYmICF2YSkge1xuICAgICAgICBjb25zdCBkcCA9IGNmZz8uZG9jX3Byb2Nlc3Npbmc7XG4gICAgICAgIGNvbnN0IHZmID0gY2ZnPy52aXNpb25fZmFsbGJhY2s7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC00IHB4LTggcHktOFwiPlxuICAgICAgICAgICAgICAgIDxBbGVydFRyaWFuZ2xlIHNpemU9ezI4fSBzdHJva2VXaWR0aD17MS41fSBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTQwMCBzaHJpbmstMFwiIC8+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMnB4XSBmb250LWJvbGQgdGV4dC1zdG9uZS03MDBcIj5WaXNpb24gYW5hbGl6aSB0YW1hbWxhbmFtYWTEsTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zdG9uZS00MDAgbXQtMVwiPkfDtnJzZWwgeWFwYXkgemVrYXlhIGfDtm5kZXJpbGRpIGFuY2FrIHlhbsSxdCBhbMSxbmFtYWTEsS48L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICB7LyogR2Vyw6dlayBoYXRhIG1lc2FqxLEgdmFyc2Egw7ZuY2Ugb251IGfDtnN0ZXIgKi99XG4gICAgICAgICAgICAgICAge3Zpc2lvbkVycm9yICYmIChcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctcmVkLTUwIGJvcmRlciBib3JkZXItcmVkLTIwMCByb3VuZGVkLXhsIHB4LTQgcHktMyB0ZXh0LVsxMXB4XVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtcmVkLTYwMCBtYi0xXCI+QVBJIEhhdGFzxLE8L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXJlZC01MDAgYnJlYWstYWxsIGZvbnQtbW9ub1wiPnt2aXNpb25FcnJvcn08L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgICAgICB7Y2ZnICYmIChcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgYmctc3RvbmUtNTAgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXN0b25lLTIwMCBvdmVyZmxvdy1oaWRkZW4gdGV4dC1bMTFweF1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtNCBweS0yIGJvcmRlci1iIGJvcmRlci1zdG9uZS0yMDAgdGV4dC1bMTBweF0gZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdGV4dC1zdG9uZS00MDAgdXBwZXJjYXNlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTW9kZWwgVGFuxLFsYW1hc8SxXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Rla25payBEw7Zrw7xtYW4gxLDFn2xlbWUnLCBpbmZvOiBkcCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdWaXNpb24gRmFsbGJhY2snLCBpbmZvOiB2ZiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXS5tYXAoKHsgbGFiZWwsIGluZm8gfSkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtsYWJlbH0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtMyBweC00IHB5LTIuNSBib3JkZXItYiBib3JkZXItc3RvbmUtMTAwIGxhc3Q6Ym9yZGVyLTBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPXtgbXQtMC41IHctMiBoLTIgcm91bmRlZC1mdWxsIHNocmluay0wICR7aW5mbz8uZm91bmQgJiYgaW5mbz8uaGFzX2tleSAmJiBpbmZvPy5tb2RlbF9pZCA/ICdiZy1lbWVyYWxkLTQwMCcgOiAnYmctcmVkLTQwMCd9YH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtaW4tdy0wXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJmb250LXNlbWlib2xkIHRleHQtc3RvbmUtNjAwXCI+e2xhYmVsfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHshaW5mbz8uc3RvcmVkICYmIDxwIGNsYXNzTmFtZT1cInRleHQtc3RvbmUtNDAwXCI+QXlhcmxhbm1hbcSxxZ88L3A+fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2luZm8/LnN0b3JlZCAmJiAhaW5mbz8uZm91bmQgJiYgPHAgY2xhc3NOYW1lPVwidGV4dC1yZWQtNTAwXCI+TW9kZWwgYnVsdW5hbWFkxLEgKElEIGdlw6dlcnNpeik8L3A+fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2luZm8/LmZvdW5kICYmICFpbmZvPy5oYXNfa2V5ICYmIDxwIGNsYXNzTmFtZT1cInRleHQtcmVkLTUwMFwiPkFQSSBhbmFodGFyxLEgZWtzaWsgdmV5YSDDp8O2esO8bGVtaXlvcjwvcD59XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aW5mbz8uZm91bmQgJiYgaW5mbz8uaGFzX2tleSAmJiAhaW5mbz8ubW9kZWxfaWQgJiYgPHAgY2xhc3NOYW1lPVwidGV4dC1hbWJlci01MDBcIj5Nb2RlbCBhZMSxIGJvxZ8gKG1vZGVsX2lkIGFsYW7EsSBkb2x1IGRlxJ9pbCk8L3A+fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2luZm8/LmZvdW5kICYmIGluZm8/Lmhhc19rZXkgJiYgaW5mbz8ubW9kZWxfaWQgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtZW1lcmFsZC02MDBcIj57aW5mby5tb2RlbF9pZH0gwrcge2luZm8ucHJvdmlkZXIgfHwgJ2dlbWluaSd9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXN0b25lLTQwMCB0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICBTb3J1bnUgZ2lkZXJkaWt0ZW4gc29ucmEgXCJBbmFsaXogRXRcIiBpbGUgdGVrcmFyIGRlbmV5aW4uXG4gICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBoLTQ4IGdhcC0zIHRleHQtc3RvbmUtNDAwXCI+XG4gICAgICAgICAgICA8VGFibGUyIHNpemU9ezMyfSBzdHJva2VXaWR0aD17MX0gLz5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEycHhdIGZvbnQtbWVkaXVtXCI+SGVuw7x6IGFuYWxpeiBlZGlsbWVtacWfIOKAlCDDtm5jZSBcIkFuYWxpeiBFdFwiIGJ1dG9udW5hIGJhc8SxbjwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuLyog4pSA4pSAIEdlbmVyaWMgS1YgYsO2bMO8bcO8IChiaWxpbm1leWVuIMWfZW1hbGFyIGnDp2luKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmZ1bmN0aW9uIEdlbmVyaWNTZWN0aW9uKHsgbGFiZWwsIHZhbHVlIH0pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBmaXJzdCA9IHZhbHVlWzBdO1xuICAgICAgICBpZiAodHlwZW9mIGZpcnN0ID09PSAnb2JqZWN0JyAmJiBmaXJzdCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgY29scyA9IE9iamVjdC5rZXlzKGZpcnN0KS5tYXAoayA9PiAoeyBrZXk6IGssIGxhYmVsOiBrLCB3OiBgJHtNYXRoLmZsb29yKDEwMCAvIE9iamVjdC5rZXlzKGZpcnN0KS5sZW5ndGgpfSVgIH0pKTtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPFNoZWV0QmxvY2sgdGl0bGU9e2xhYmVsfSBjb2xvcj1cImJsdWVcIj5cbiAgICAgICAgICAgICAgICAgICAgPFNoZWV0RGF0YVRhYmxlIGNvbHM9e2NvbHN9IHJvd3M9e3ZhbHVlfSAvPlxuICAgICAgICAgICAgICAgIDwvU2hlZXRCbG9jaz5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxTaGVldEJsb2NrIHRpdGxlPXtsYWJlbH0gY29sb3I9XCJzdG9uZVwiPlxuICAgICAgICAgICAgICAgIDxTaGVldFRhZ1RhYmxlIGl0ZW1zPXt2YWx1ZX0gLz5cbiAgICAgICAgICAgIDwvU2hlZXRCbG9jaz5cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IHJvd3MgPSBPYmplY3QuZW50cmllcyh2YWx1ZSkuZmlsdGVyKChbLCB2XSkgPT4gdikubWFwKChbaywgdl0pID0+IFtrLCBTdHJpbmcodildKTtcbiAgICAgICAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxTaGVldEJsb2NrIHRpdGxlPXtsYWJlbH0gY29sb3I9XCJibHVlXCI+XG4gICAgICAgICAgICAgICAgPFNoZWV0S1ZUYWJsZSByb3dzPXtyb3dzfSAvPlxuICAgICAgICAgICAgPC9TaGVldEJsb2NrPlxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPFNoZWV0QmxvY2sgdGl0bGU9e2xhYmVsfSBjb2xvcj1cInN0b25lXCI+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTJweF0gdGV4dC1zdG9uZS02MDAgbGVhZGluZy1yZWxheGVkIHB4LTQgcHktM1wiPnt2YWx1ZX08L3A+XG4gICAgICAgICAgICA8L1NoZWV0QmxvY2s+XG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG4vKiDilIDilIAgVGVrbmlrIFJlc2ltIHRhYmxvIGfDtnLDvG7DvG3DvCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbi8qIOKUgOKUgCBFeGNlbCBiZW56ZXJpIHNwcmVhZHNoZWV0IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuZnVuY3Rpb24gRXhjZWxTaGVldCh7IHJvd3MsIGNvbHMgfSkge1xuICAgIC8qIHJvd3M6IGRpemktb2YtZGl6aSBbW2xhYmVsLHZhbF0sLi4uXSB2ZXlhIGRpemktb2Ytb2JqZSBbe2tleTp2YWx9LC4uLl0gKi9cbiAgICBpZiAoIXJvd3MgfHwgcm93cy5sZW5ndGggPT09IDApIHJldHVybiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgaC0yNCB0ZXh0LXN0b25lLTQwMCB0ZXh0LVsxMnB4XVwiPlZlcmkgeW9rPC9kaXY+XG4gICAgKTtcblxuICAgIGNvbnN0IGlzS1YgPSBBcnJheS5pc0FycmF5KHJvd3NbMF0pO1xuXG4gICAgaWYgKGlzS1YpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDx0YWJsZSBjbGFzc05hbWU9XCJ3LWZ1bGwgYm9yZGVyLWNvbGxhcHNlIHRleHQtWzEycHhdXCI+XG4gICAgICAgICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgICAgICAgICA8dHIgY2xhc3NOYW1lPVwiYmctWyMyMTczNDZdLzEwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwidy04IGJvcmRlciBib3JkZXItc3RvbmUtMjAwIGJnLXN0b25lLTEwMCB0ZXh0LXN0b25lLTQwMCB0ZXh0LVsxMHB4XSBmb250LW5vcm1hbCBweC0yIHB5LTEuNSB0ZXh0LWNlbnRlclwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwiYm9yZGVyIGJvcmRlci1zdG9uZS0yMDAgYmctWyMyMTczNDZdLzEwIHRleHQtWyMyMTczNDZdIGZvbnQtYm9sZCBweC0zIHB5LTEuNSB0ZXh0LWxlZnQgdGV4dC1bMTFweF1cIj5BbGFuPC90aD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJib3JkZXIgYm9yZGVyLXN0b25lLTIwMCBiZy1bIzIxNzM0Nl0vMTAgdGV4dC1bIzIxNzM0Nl0gZm9udC1ib2xkIHB4LTMgcHktMS41IHRleHQtbGVmdCB0ZXh0LVsxMXB4XVwiPkRlxJ9lcjwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAgICAgIHtyb3dzLm1hcCgoW2xhYmVsLCB2YWxdLCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8dHIga2V5PXtpfSBjbGFzc05hbWU9e2kgJSAyID09PSAwID8gJ2JnLXdoaXRlJyA6ICdiZy1zdG9uZS01MC82MCd9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJib3JkZXIgYm9yZGVyLXN0b25lLTIwMCBiZy1zdG9uZS0xMDAgdGV4dC1zdG9uZS00MDAgdGV4dC1bMTBweF0gcHgtMiBweS0xLjUgdGV4dC1jZW50ZXIgdy04XCI+e2kgKyAxfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cImJvcmRlciBib3JkZXItc3RvbmUtMjAwIHB4LTMgcHktMS41IHRleHQtc3RvbmUtNTAwIGZvbnQtbWVkaXVtXCI+e2xhYmVsfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cImJvcmRlciBib3JkZXItc3RvbmUtMjAwIHB4LTMgcHktMS41IHRleHQtc3RvbmUtODAwXCI+e3ZhbH08L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyogT2JqZSBkaXppc2kg4oaSIGNvbHVtbnMgKi9cbiAgICBjb25zdCBoZWFkZXJzID0gY29scyB8fCBPYmplY3Qua2V5cyhyb3dzWzBdKTtcbiAgICByZXR1cm4gKFxuICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIGJvcmRlci1jb2xsYXBzZSB0ZXh0LVsxMnB4XVwiPlxuICAgICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInctOCBib3JkZXIgYm9yZGVyLXN0b25lLTIwMCBiZy1zdG9uZS0xMDAgdGV4dC1zdG9uZS00MDAgdGV4dC1bMTBweF0gZm9udC1ub3JtYWwgcHgtMiBweS0xLjUgdGV4dC1jZW50ZXJcIiAvPlxuICAgICAgICAgICAgICAgICAgICB7aGVhZGVycy5tYXAoaCA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8dGgga2V5PXtofSBjbGFzc05hbWU9XCJib3JkZXIgYm9yZGVyLXN0b25lLTIwMCBiZy1bIzIxNzM0Nl0vMTAgdGV4dC1bIzIxNzM0Nl0gZm9udC1ib2xkIHB4LTMgcHktMS41IHRleHQtbGVmdCB0ZXh0LVsxMXB4XVwiPntofTwvdGg+XG4gICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICAgICAgICAgIHtyb3dzLm1hcCgocm93LCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgIDx0ciBrZXk9e2l9IGNsYXNzTmFtZT17aSAlIDIgPT09IDAgPyAnYmctd2hpdGUnIDogJ2JnLXN0b25lLTUwLzYwJ30+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwiYm9yZGVyIGJvcmRlci1zdG9uZS0yMDAgYmctc3RvbmUtMTAwIHRleHQtc3RvbmUtNDAwIHRleHQtWzEwcHhdIHB4LTIgcHktMS41IHRleHQtY2VudGVyXCI+e2kgKyAxfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICB7aGVhZGVycy5tYXAoaCA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGtleT17aH0gY2xhc3NOYW1lPVwiYm9yZGVyIGJvcmRlci1zdG9uZS0yMDAgcHgtMyBweS0xLjUgdGV4dC1zdG9uZS04MDBcIj57cm93W2hdID8/ICcnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgIDwvdGFibGU+XG4gICAgKTtcbn1cblxuZnVuY3Rpb24gVGVrbmlrVGFibGUoeyB2YSB9KSB7XG4gICAgY29uc3QgbGxtU2tpcHBlZCA9IHZhPy5sbG1fc2tpcHBlZCA9PT0gdHJ1ZTtcblxuICAgIGNvbnN0IFNFQ1RJT05fTEFCRUxTID0ge1xuICAgICAgICBiYXNsaWtfYmxva3U6ICAgJ0JhxZ9sxLFrIEJsb8SfdScsXG4gICAgICAgIHBhcmNhX2xpc3Rlc2k6ICAnUGFyw6dhIExpc3Rlc2knLFxuICAgICAgICBvbGN1bGFyOiAgICAgICAgJ8OWbMOnw7xsZXInLFxuICAgICAgICB0b2xlcmFuc2xhcjogICAgJ1RvbGVyYW5zbGFyJyxcbiAgICAgICAgbm90bGFyOiAgICAgICAgICdOb3RsYXInLFxuICAgICAgICB5dXpleV9pc2xlbWxlcmk6J1nDvHpleSDEsMWfbGVtbGVyaScsXG4gICAgICAgIGtlc2l0bGVyOiAgICAgICAnS2VzaXRsZXInLFxuICAgICAgICBpc2xlbV9zaXJhc2k6ICAgJ8SwxZ9sZW0gU8SxcmFzxLEnLFxuICAgICAgICBwYXJjYV90YW5pbTogICAgJ1BhcsOnYSBUYW7EsW3EsScsXG4gICAgICAgIGdlb21ldHJpazogICAgICAnR2VvbWV0cmlrIEJpbGdpbGVyJyxcbiAgICAgICAgbWFsemVtZV91cmV0aW06ICdNYWx6ZW1lICYgw5xyZXRpbScsXG4gICAgICAgIGl6bGVuZWJpbGlybGlrOiAnxLB6bGVuZWJpbGlybGlrJyxcbiAgICAgICAgZ2VuZWxfbWV0aW46ICAgICdHZW5lbCBNZXRpbicsXG4gICAgfTtcblxuICAgIGNvbnN0IEZJRUxEX0xBQkVMUyA9IHtcbiAgICAgICAgY2l6aW1fbnVtYXJhc2k6J8OHaXppbSBObycsIGJhc2xpazonQmHFn2zEsWsnLCBmaXJtYTonRmlybWEnLCBwcm9qZTonUHJvamUnLFxuICAgICAgICByZXZpenlvbjonUmV2aXp5b24nLCBvbGNlazonw5Zsw6dlaycsIHRhcmloOidUYXJpaCcsIGNpemVuOifDh2l6ZW4nLFxuICAgICAgICBvbmF5bGF5YW46J09uYXlsYXlhbicsIGtvbnRyb2xfZWRlbjonS29udHJvbCBFZGVuJywgbWFsemVtZTonTWFsemVtZScsXG4gICAgICAgIHl1emV5X2lzbGVtOidZw7x6ZXkgxLDFn2xlbWknLCBzZXJ0bGlrOidTZXJ0bGlrJywgYWdpcmxpazonQcSfxLFybMSxaycsXG4gICAgICAgIGJpcmltOidCaXJpbScsIHNheWZhOidTYXlmYScsIGJsYXR0X2Zvcm1hdDonRm9ybWF0JyxcbiAgICAgICAgcGFyY2FfYWRpOidQYXLDp2EgQWTEsScsIHBhcmNhX2tvZHU6J1BhcsOnYSBLb2R1Jywga2ltbGlrX251bWFyYXNpOidLaW1saWsgTm8nLFxuICAgICAgICBzYXlmYV9iaWxnaXNpOidTYXlmYSBCaWxnaXNpJywgY2l6aW1fbm86J8OHaXppbSBObycsIHlhcmltX21hbXVsOidZYXLEsSBNYW11bCcsXG4gICAgICAgIGFjaWxpbV91enVubHVndTonQcOnxLFsxLFtIFV6dW5sdcSfdScsIGJveXV0bGFyOidCb3l1dGxhcicsIGJ1a21lX3lhcmljYXBpOidCw7xrbWUgWWFyxLHDp2FwxLEnLFxuICAgICAgICBrZW5hcl9tZXNhZmVsZXJpOidLZW5hciBNZXNhZmVsZXJpJywga2VzaXQ6J0tlc2l0JyxcbiAgICAgICAgeXV6ZXlfc3RhbmRhcmRpOidZw7x6ZXkgU3RhbmRhcmTEsScsIGtlc2ltX3N0YW5kYXJkaTonS2VzaW0gU3RhbmRhcmTEsScsXG4gICAgICAgIHNheWZhX2Zvcm1hdGk6J1NheWZhIEZvcm1hdMSxJyxcbiAgICAgICAgdGFsYXNsaV90b2xlcmFuczonVGFsYcWfbMSxIFRvbGVyYW5zJywgdGFsYXNzaXpfdG9sZXJhbnM6J1RhbGHFn3PEsXogVG9sZXJhbnMnLFxuICAgICAgICBrYXluYWtsaV90b2xlcmFuczonS2F5bmFrbMSxIFRvbGVyYW5zJywgZG9rdW1fdG9sZXJhbnM6J0TDtmvDvG0gVG9sZXJhbnMnLFxuICAgICAgICBjaXppbV90YXJpaGk6J8OHaXppbSBUYXJpaGknLCBrYWxpdGVfa29udHJvbDonS2FsaXRlIEtvbnRyb2wnLCBjYWRfYmlsZ2lzaTonQ0FEIEJpbGdpc2knLFxuICAgICAgICBwb3o6J1BveicsIGFkZXQ6J0FkZXQnLCBhY2lrbGFtYTonQcOnxLFrbGFtYScsXG4gICAgICAgIC8vIMOWbMOnw7xsZXIgKHllbmkgxZ9lbWEpXG4gICAgICAgIGV0aWtldDonRXRpa2V0JywgZGVnZXI6J0RlxJ9lcicsIHRvbGVyYW5zOidUb2xlcmFucycsXG4gICAgICAgIC8vIFRvbGVyYW5zbGFyICh5ZW5pIMWfZW1hKVxuICAgICAgICB0aXA6J1RpcCcsXG4gICAgICAgIC8vIMSwxZ9sZW0gc8SxcmFzxLEgKHllbmkgxZ9lbWEpXG4gICAgICAgIHNpcmE6J1PEsXJhJywgaXNsZW06J8SwxZ9sZW0nLFxuICAgIH07XG5cbiAgICBjb25zdCBTS0lQID0gbmV3IFNldChbJ2ltYWdlX3R5cGUnLCAna2F5bmFrJywgJ3Byb2pla3NpeW9uX2FjaXNpJywgJ2xsbV9za2lwcGVkJ10pO1xuXG4gICAgLyogQsO2bMO8bWxlcmkgZGluYW1payBvbGFyYWsgw6fEsWthciAqL1xuICAgIGNvbnN0IHNlY3Rpb25zID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWxdIG9mIE9iamVjdC5lbnRyaWVzKHZhIHx8IHt9KSkge1xuICAgICAgICBpZiAoU0tJUC5oYXMoa2V5KSB8fCAhdmFsKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSBTRUNUSU9OX0xBQkVMU1trZXldIHx8IGtleTtcblxuICAgICAgICBpZiAoa2V5ID09PSAnYmFzbGlrX2Jsb2t1JyAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICBjb25zdCByb3dzID0gT2JqZWN0LmVudHJpZXModmFsKS5maWx0ZXIoKFssdl0pID0+IHYpXG4gICAgICAgICAgICAgICAgLm1hcCgoW2ssdl0pID0+IFtGSUVMRF9MQUJFTFNba10gfHwgaywgU3RyaW5nKHYpXSk7XG4gICAgICAgICAgICBpZiAocm93cy5sZW5ndGgpIHNlY3Rpb25zLnB1c2goeyBrZXksIHRpdGxlLCB0eXBlOiAna3YnLCByb3dzIH0pO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWwpICYmIHZhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbFswXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAvKiBvYmplIGRpemlzaSDihpIga29sb24gYmHFn2zEsWtsYXLEsW7EsSBUw7xya8OnZSB5YXAgKi9cbiAgICAgICAgICAgICAgICBjb25zdCByYXdDb2xzID0gT2JqZWN0LmtleXModmFsWzBdKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xzID0gcmF3Q29scy5tYXAoYyA9PiBGSUVMRF9MQUJFTFNbY10gfHwgYyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93cyA9IHZhbC5tYXAociA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICByYXdDb2xzLmZvckVhY2goKGMsIGkpID0+IHsgb3V0W2NvbHNbaV1dID0gcltjXSA/PyAnJzsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh7IGtleSwgdGl0bGUsIHR5cGU6ICd0YWJsZScsIHJvd3MsIGNvbHMgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3MgPSB2YWwubWFwKCh2LCBpKSA9PiBbU3RyaW5nKGkgKyAxKSwgU3RyaW5nKHYpXSk7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh7IGtleSwgdGl0bGUsIHR5cGU6ICdrdicsIHJvd3MgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICBjb25zdCByb3dzID0gT2JqZWN0LmVudHJpZXModmFsKS5maWx0ZXIoKFssdl0pID0+IHYpXG4gICAgICAgICAgICAgICAgLm1hcCgoW2ssdl0pID0+IFtGSUVMRF9MQUJFTFNba10gfHwgaywgU3RyaW5nKHYpXSk7XG4gICAgICAgICAgICBpZiAocm93cy5sZW5ndGgpIHNlY3Rpb25zLnB1c2goeyBrZXksIHRpdGxlLCB0eXBlOiAna3YnLCByb3dzIH0pO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycgJiYgdmFsLnRyaW0oKSkge1xuICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh7IGtleSwgdGl0bGUsIHR5cGU6ICd0ZXh0JywgdGV4dDogdmFsIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgW2FjdGl2ZUtleSwgc2V0QWN0aXZlS2V5XSA9IHVzZVN0YXRlKCgpID0+IHNlY3Rpb25zWzBdPy5rZXkgfHwgJycpO1xuICAgIGNvbnN0IGFjdGl2ZSA9IHNlY3Rpb25zLmZpbmQocyA9PiBzLmtleSA9PT0gYWN0aXZlS2V5KSB8fCBzZWN0aW9uc1swXTtcblxuICAgIGlmICghc2VjdGlvbnMubGVuZ3RoKSByZXR1cm4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGgtMzIgdGV4dC1zdG9uZS00MDAgdGV4dC1bMTJweF1cIj5cbiAgICAgICAgICAgIFRla25payDDp2l6aW0gYW5hbGl6aSBidWx1bmFtYWTEsVxuICAgICAgICA8L2Rpdj5cbiAgICApO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGgtZnVsbFwiPlxuICAgICAgICAgICAgey8qIOKUgOKUgCBMTE0gYXRsYW5kxLEgdXlhcsSxc8SxIOKUgOKUgCAqL31cbiAgICAgICAgICAgIHtsbG1Ta2lwcGVkICYmIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNocmluay0wIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTQgcHktMiBiZy1hbWJlci01MCBib3JkZXItYiBib3JkZXItYW1iZXItMjAwIHRleHQtWzExcHhdIHRleHQtYW1iZXItNzAwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZFwiPkxMTSdkZW4gZGV2YW0gZWRpbG1lZGk8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItNTAwXCI+4oCUIFlhbG7EsXpjYSBEWEYgbWV0aW4gZW50aXR5J2xlcmkgZ8O2c3RlcmlsaXlvci4gRGV0YXlsxLEgYW5hbGl6IGnDp2luIExMTSdpIGV0a2lubGXFn3RpcmViaWxpcnNpbml6Ljwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICB7Lyog4pSA4pSAIEV4Y2VsIHNla21lIMOndWJ1xJ91IOKUgOKUgCAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1lbmQgZ2FwLTAgYmctWyNmMGYwZjBdIGJvcmRlci1iIGJvcmRlci1zdG9uZS0zMDAgcHgtMyBwdC0yIG92ZXJmbG93LXgtYXV0byBzaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgIHtzZWN0aW9ucy5tYXAocyA9PiAoXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIGtleT17cy5rZXl9XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRBY3RpdmVLZXkocy5rZXkpfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC00IHB5LTEuNSB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHdoaXRlc3BhY2Utbm93cmFwIGJvcmRlciBib3JkZXItYi0wIHJvdW5kZWQtdC1tZCBtci0wLjUgdHJhbnNpdGlvbi1hbGwgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmU/LmtleSA9PT0gcy5rZXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyAnYmctd2hpdGUgYm9yZGVyLXN0b25lLTMwMCB0ZXh0LVsjMjE3MzQ2XSBzaGFkb3ctc20gLW1iLXB4IHotMTAgcmVsYXRpdmUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJ2JnLVsjZGNlNmQwXSBib3JkZXItWyNkY2U2ZDBdIHRleHQtc3RvbmUtNTAwIGhvdmVyOmJnLVsjYzlkOWJhXSBob3Zlcjp0ZXh0LXN0b25lLTcwMCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICB7cy50aXRsZX1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgey8qIOKUgOKUgCBTcHJlYWRzaGVldCBpw6dlcmnEn2kg4pSA4pSAICovfVxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgb3ZlcmZsb3ctYXV0byBiZy13aGl0ZVwiPlxuICAgICAgICAgICAgICAgIHthY3RpdmU/LnR5cGUgPT09ICd0ZXh0JyA/IChcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwLTUgdGV4dC1bMTJweF0gdGV4dC1zdG9uZS03MDAgbGVhZGluZy1yZWxheGVkIHdoaXRlc3BhY2UtcHJlLXdyYXBcIj57YWN0aXZlLnRleHR9PC9kaXY+XG4gICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgPEV4Y2VsU2hlZXQgcm93cz17YWN0aXZlPy5yb3dzfSBjb2xzPXthY3RpdmU/LmNvbHN9IC8+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG4vKiDilIDilIAgTmVzdGluZyB0YWJsbyBnw7Zyw7xuw7xtw7wg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovXG5mdW5jdGlvbiBOZXN0aW5nVGFibGUoeyB2YSB9KSB7XG4gICAgaWYgKCF2YSkgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBoLTMyIHRleHQtc3RvbmUtNDAwIHRleHQtWzEycHhdXCI+XG4gICAgICAgICAgICBOZXN0aW5nIGFuYWxpemkgYnVsdW5hbWFkxLFcbiAgICAgICAgPC9kaXY+XG4gICAgKTtcblxuICAgIGNvbnN0IGdlbmVsUm93cyA9IFtcbiAgICAgICAgWydQcm9ncmFtJywgICAgICAgICB2YS5wcm9ncmFtX2FkaV0sXG4gICAgICAgIFsnTWFsemVtZSBObycsICAgICAgdmEubWFsemVtZV9udW1hcmFzaV0sXG4gICAgICAgIFsnTWFsemVtZScsICAgICAgICAgdmEubWFsemVtZV0sXG4gICAgICAgIFsnS2FsxLFubMSxaycsICAgICAgICB2YS5rYWxpbmxpa10sXG4gICAgICAgIFsnTGV2aGEgQm95dXR1JywgICAgdmEubGV2aGFfYm95dXR1XSxcbiAgICAgICAgWydUb3BsYW0gUGFyw6dhJywgICAgdmEudG9wbGFtX3BhcmNhX2FkZWRpXSxcbiAgICAgICAgWydLdWxsYW7EsW0gT3JhbsSxJywgIHZhLmt1bGxhbmltX29yYW5pXSxcbiAgICAgICAgWydGaXJlIE9yYW7EsScsICAgICAgdmEuZmlyZV9vcmFuaV0sXG4gICAgXS5maWx0ZXIoKFssIHZdKSA9PiB2KTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC02IGZsZXggZmxleC1jb2wgZ2FwLTZcIj5cbiAgICAgICAgICAgIHtnZW5lbFJvd3MubGVuZ3RoID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgPFNoZWV0QmxvY2sgdGl0bGU9XCJHZW5lbCBCaWxnaWxlclwiIGNvbG9yPVwib3JhbmdlXCIgaWNvbj17Q3B1fT5cbiAgICAgICAgICAgICAgICAgICAgPFNoZWV0S1ZUYWJsZSByb3dzPXtnZW5lbFJvd3N9IGhpZ2hsaWdodEtleXM9e1snS3VsbGFuxLFtIE9yYW7EsScsICdGaXJlIE9yYW7EsSddfSAvPlxuICAgICAgICAgICAgICAgIDwvU2hlZXRCbG9jaz5cbiAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgIHt2YS5pc2xlbWxlcj8ubGVuZ3RoID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgPFNoZWV0QmxvY2sgdGl0bGU9XCJZYXDEsWxhY2FrIMSwxZ9sZW1sZXJcIiBjb2xvcj1cInZpb2xldFwiPlxuICAgICAgICAgICAgICAgICAgICA8U2hlZXRUYWdUYWJsZSBpdGVtcz17dmEuaXNsZW1sZXJ9IC8+XG4gICAgICAgICAgICAgICAgPC9TaGVldEJsb2NrPlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAge3ZhLnBhcmNhX2xpc3Rlc2k/Lmxlbmd0aCA+IDAgJiYgKFxuICAgICAgICAgICAgICAgIDxTaGVldEJsb2NrIHRpdGxlPVwiUGFyw6dhIExpc3Rlc2lcIiBjb2xvcj1cIm9yYW5nZVwiIGljb249e0xheWVyc30+XG4gICAgICAgICAgICAgICAgICAgIDxTaGVldERhdGFUYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgY29scz17W1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsga2V5OiAncGFyY2FfYWRpJywgbGFiZWw6ICdQYXLDp2EgQWTEsScsICB3OiAnNTAlJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsga2V5OiAnYWRldCcsICAgICAgbGFiZWw6ICdBZGV0JywgICAgICAgIHc6ICcxNSUnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBrZXk6ICdtYWx6ZW1lJywgICBsYWJlbDogJ01hbHplbWUnLCAgICAgdzogJzM1JScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF19XG4gICAgICAgICAgICAgICAgICAgICAgICByb3dzPXt2YS5wYXJjYV9saXN0ZXNpfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDwvU2hlZXRCbG9jaz5cbiAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgIHt2YS5ub3RsYXI/Lmxlbmd0aCA+IDAgJiYgKFxuICAgICAgICAgICAgICAgIDxTaGVldEJsb2NrIHRpdGxlPVwiTm90bGFyXCIgY29sb3I9XCJzdG9uZVwiPlxuICAgICAgICAgICAgICAgICAgICA8U2hlZXROb3RlVGFibGUgaXRlbXM9e3ZhLm5vdGxhcn0gLz5cbiAgICAgICAgICAgICAgICA8L1NoZWV0QmxvY2s+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICB7dmEuZ2VuZWxfbWV0aW4gJiYgKFxuICAgICAgICAgICAgICAgIDxTaGVldEJsb2NrIHRpdGxlPVwiR2VuZWwgTWV0aW5cIiBjb2xvcj1cInN0b25lXCI+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEycHhdIHRleHQtc3RvbmUtNjAwIGxlYWRpbmctcmVsYXhlZCBweC0xXCI+e3ZhLmdlbmVsX21ldGlufTwvcD5cbiAgICAgICAgICAgICAgICA8L1NoZWV0QmxvY2s+XG4gICAgICAgICAgICApfVxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG4vKiDilIDilIAgU3ByZWFkc2hlZXQgYmlsZcWfZW5sZXJpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuZnVuY3Rpb24gU2hlZXRCbG9jayh7IHRpdGxlLCBpY29uOiBJY29uLCBjb2xvciA9ICdzdG9uZScsIGNoaWxkcmVuIH0pIHtcbiAgICBjb25zdCBoZHIgPSB7XG4gICAgICAgIGJsdWU6ICAgJ2JnLVsjMzc4QUREXS84IHRleHQtWyMzNzhBRERdIGJvcmRlci1bIzM3OEFERF0vMjAnLFxuICAgICAgICB2aW9sZXQ6ICdiZy12aW9sZXQtNTAgdGV4dC12aW9sZXQtNjAwIGJvcmRlci12aW9sZXQtMjAwJyxcbiAgICAgICAgb3JhbmdlOiAnYmctb3JhbmdlLTUwIHRleHQtb3JhbmdlLTUwMCBib3JkZXItb3JhbmdlLTIwMCcsXG4gICAgICAgIGVtZXJhbGQ6J2JnLWVtZXJhbGQtNTAgdGV4dC1lbWVyYWxkLTYwMCBib3JkZXItZW1lcmFsZC0yMDAnLFxuICAgICAgICBzdG9uZTogICdiZy1zdG9uZS01MCB0ZXh0LXN0b25lLTUwMCBib3JkZXItc3RvbmUtMjAwJyxcbiAgICB9O1xuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXN0b25lLTIwMCBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtNCBweS0yIGJvcmRlci1iICR7aGRyW2NvbG9yXX1gfT5cbiAgICAgICAgICAgICAgICB7SWNvbiAmJiA8SWNvbiBzaXplPXsxMn0gLz59XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1ibGFjayB0cmFja2luZy13aWRlc3QgdXBwZXJjYXNlXCI+e3RpdGxlfTwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZVwiPntjaGlsZHJlbn08L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuZnVuY3Rpb24gU2hlZXRLVlRhYmxlKHsgcm93cywgaGlnaGxpZ2h0S2V5cyA9IFtdIH0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtWzEycHhdXCI+XG4gICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAge3Jvd3MubWFwKChbaywgdl0sIGkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGkgPSBoaWdobGlnaHRLZXlzLmluY2x1ZGVzKGspO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRyIGtleT17aX0gY2xhc3NOYW1lPXtpICUgMiA9PT0gMCA/ICdiZy13aGl0ZScgOiAnYmctc3RvbmUtNTAvNjAnfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicHgtNCBweS0yIHctMzYgZm9udC1zZW1pYm9sZCB0ZXh0LXN0b25lLTQwMCBib3JkZXItciBib3JkZXItc3RvbmUtMTAwIHdoaXRlc3BhY2Utbm93cmFwXCI+e2t9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPXtgcHgtNCBweS0yIGZvbnQtbWVkaXVtICR7aGkgPyAndGV4dC1lbWVyYWxkLTYwMCBmb250LWJvbGQnIDogJ3RleHQtc3RvbmUtNzAwJ31gfT57dn08L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgIDwvdGFibGU+XG4gICAgKTtcbn1cblxuZnVuY3Rpb24gU2hlZXREYXRhVGFibGUoeyBjb2xzLCByb3dzIH0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtWzEycHhdXCI+XG4gICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzTmFtZT1cImJnLXN0b25lLTUwIGJvcmRlci1iIGJvcmRlci1zdG9uZS0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAge2NvbHMubWFwKGMgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRoIGtleT17Yy5rZXl9IGNsYXNzTmFtZT1cInB4LTQgcHktMiB0ZXh0LWxlZnQgdGV4dC1bMTBweF0gZm9udC1ibGFjayB0ZXh0LXN0b25lLTQwMCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXJcIiBzdHlsZT17eyB3aWR0aDogYy53IH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjLmxhYmVsfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC90aD5cbiAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAge3Jvd3MubWFwKChyLCBpKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgIDx0ciBrZXk9e2l9IGNsYXNzTmFtZT17YGJvcmRlci1iIGJvcmRlci1zdG9uZS01MCBsYXN0OmJvcmRlci0wICR7aSAlIDIgPT09IDAgPyAnYmctd2hpdGUnIDogJ2JnLXN0b25lLTUwLzQwJ31gfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtjb2xzLm1hcChjID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQga2V5PXtjLmtleX0gY2xhc3NOYW1lPVwicHgtNCBweS0yIHRleHQtc3RvbmUtNzAwIGZvbnQtbWVkaXVtXCI+e3JbYy5rZXldIHx8ICfigJQnfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgIDwvdGFibGU+XG4gICAgKTtcbn1cblxuZnVuY3Rpb24gU2hlZXRUYWdUYWJsZSh7IGl0ZW1zIH0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtWzEycHhdXCI+XG4gICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAge2l0ZW1zLm1hcCgoaXQsIGkpID0+IChcbiAgICAgICAgICAgICAgICAgICAgPHRyIGtleT17aX0gY2xhc3NOYW1lPXtgYm9yZGVyLWIgYm9yZGVyLXN0b25lLTUwIGxhc3Q6Ym9yZGVyLTAgJHtpICUgMiA9PT0gMCA/ICdiZy13aGl0ZScgOiAnYmctc3RvbmUtNTAvNDAnfWB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktMiB3LTEwIHRleHQtc3RvbmUtMzAwIGZvbnQtbW9ubyBmb250LWJvbGQgdGV4dC1bMTBweF1cIj57aSArIDF9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweC00IHB5LTIgdGV4dC1zdG9uZS03MDAgZm9udC1tZWRpdW1cIj57U3RyaW5nKGl0KX08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgPC90YWJsZT5cbiAgICApO1xufVxuXG5mdW5jdGlvbiBTaGVldE5vdGVUYWJsZSh7IGl0ZW1zIH0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtWzEycHhdXCI+XG4gICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAge2l0ZW1zLm1hcCgoaXQsIGkpID0+IChcbiAgICAgICAgICAgICAgICAgICAgPHRyIGtleT17aX0gY2xhc3NOYW1lPXtgYm9yZGVyLWIgYm9yZGVyLXN0b25lLTUwIGxhc3Q6Ym9yZGVyLTAgJHtpICUgMiA9PT0gMCA/ICdiZy13aGl0ZScgOiAnYmctc3RvbmUtNTAvNDAnfWB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInB4LTQgcHktMiB3LTggdGV4dC1zdG9uZS0zMDAgZm9udC1ib2xkXCI+4oCiPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJweC00IHB5LTIgdGV4dC1zdG9uZS02MDAgbGVhZGluZy1yZWxheGVkXCI+e1N0cmluZyhpdCl9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgIDwvdGFibGU+XG4gICAgKTtcbn1cblxuLyog4pSA4pSAIEdyaWQga2FydMSxIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuZnVuY3Rpb24gVGVrbmlrS2FydCh7IGl0ZW0sIGFsbEl0ZW1zLCBvbk9wZW4sIG9uVmVjdG9yaXplLCB2ZWN0b3JpemluZywgb25PcGVuTGlua2VkLCBvblN0YXJ0TGluaywgb25VbmxpbmssIG9uRGV0YWlsLCBvbkRlbGV0ZSB9KSB7XG4gICAgY29uc3QgW2ltZ0VyciwgICBzZXRJbWdFcnJdICAgPSB1c2VTdGF0ZShmYWxzZSk7XG4gICAgY29uc3QgW2N0eE1lbnUsICBzZXRDdHhNZW51XSAgPSB1c2VTdGF0ZShudWxsKTtcbiAgICBjb25zdCBjbGlja1RpbWVyID0gdXNlUmVmKG51bGwpO1xuICAgIGNvbnN0IGlzRHdnID0gWydkd2cnLCdkeGYnLCdzdHAnLCdzdGVwJ10uaW5jbHVkZXMoKGl0ZW0uZmlsZV90eXBlfHwnJykudG9Mb3dlckNhc2UoKSk7XG5cbiAgICBjb25zdCB2YSAgICAgICAgPSBpdGVtLm1ldGE/LnZpc2lvbl9hbmFseXNpcztcbiAgICBjb25zdCBpc1RSICAgICAgPSB2YT8uaW1hZ2VfdHlwZSA9PT0gJ3Rla25pa19yZXNpbSc7XG4gICAgY29uc3QgYmIgICAgICAgID0gaXNUUiA/ICh2YS5iYXNsaWtfYmxva3UgfHwge30pIDoge307XG4gICAgY29uc3Qgc3RhdHVzICAgID0gaXRlbS5tZXRhPy50cmFuc2NyaXB0aW9uX3N0YXR1cztcbiAgICBjb25zdCBjYW5BbmFseXplID0gc3RhdHVzICE9PSAncHJvY2Vzc2luZycgJiYgIXZhO1xuICAgIGNvbnN0IGJhZ2xpICAgICA9IGl0ZW0ubWV0YT8uYmFnbGlfZG9zeWFsYXIgfHwge307XG4gICAgY29uc3QgbmVzdGluZ0lkID0gYmFnbGkubmVzdGluZztcbiAgICBjb25zdCBjYWRJZCAgICAgPSBiYWdsaS5jYWQ7XG5cbiAgICBjb25zdCBuZXN0aW5nSXRlbSAgICA9IG5lc3RpbmdJZCA/IChhbGxJdGVtcyB8fCBbXSkuZmluZChpID0+IGkuaWQgPT09IG5lc3RpbmdJZCkgOiBudWxsO1xuICAgIGNvbnN0IG5lc3RpbmdWaXNpb24gID0gbmVzdGluZ0l0ZW0/Lm1ldGE/LnZpc2lvbl9hbmFseXNpcztcbiAgICBjb25zdCBuZXN0aW5nTWF0TnVtICA9IG5lc3RpbmdWaXNpb24/Lm1hbHplbWVfbnVtYXJhc2kgfHwgJyc7XG5cbiAgICAvLyBUZWsgdMSxayDihpIgw6dpemltaSBhw6cgICB8ICAgw4dpZnQgdMSxayDihpIgbmVzdGluZyBhw6dcbiAgICBjb25zdCBoYW5kbGVDbGljayA9ICgpID0+IHtcbiAgICAgICAgaWYgKGNsaWNrVGltZXIuY3VycmVudCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGNsaWNrVGltZXIuY3VycmVudCk7XG4gICAgICAgICAgICBjbGlja1RpbWVyLmN1cnJlbnQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKG5lc3RpbmdJZCkgb25PcGVuTGlua2VkKG5lc3RpbmdJZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjbGlja1RpbWVyLmN1cnJlbnQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjbGlja1RpbWVyLmN1cnJlbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIG9uT3BlbihpdGVtKTtcbiAgICAgICAgICAgIH0sIDIyMCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgaGFuZGxlQ29udGV4dE1lbnUgPSAoZSkgPT4ge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNldEN0eE1lbnUoeyB4OiBlLmNsaWVudFgsIHk6IGUuY2xpZW50WSB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPD5cbiAgICAgICAge2N0eE1lbnUgJiYgKFxuICAgICAgICAgICAgPENvbnRleHRNZW51XG4gICAgICAgICAgICAgICAgeD17Y3R4TWVudS54fSB5PXtjdHhNZW51Lnl9XG4gICAgICAgICAgICAgICAgaXRlbT17aXRlbX1cbiAgICAgICAgICAgICAgICBvbkRlbGV0ZT17b25EZWxldGV9XG4gICAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4gc2V0Q3R4TWVudShudWxsKX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICl9XG4gICAgICAgIDxkaXZcbiAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZUNsaWNrfVxuICAgICAgICAgICAgb25Db250ZXh0TWVudT17aGFuZGxlQ29udGV4dE1lbnV9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJncm91cCBiZy13aGl0ZSBib3JkZXIgYm9yZGVyLXN0b25lLTIwMCByb3VuZGVkLXhsIG92ZXJmbG93LWhpZGRlbiBob3Zlcjpib3JkZXItWyMzNzhBRERdLzQwIGhvdmVyOnNoYWRvdy1sZyB0cmFuc2l0aW9uLWFsbCBjdXJzb3ItcG9pbnRlciBmbGV4IGZsZXgtY29sXCJcbiAgICAgICAgPlxuICAgICAgICAgICAgey8qIMOWbml6bGVtZSAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgaC1bMTQwcHhdIGJnLXN0b25lLTUwIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICAgICAgICAgIHshaW1nRXJyICYmICFpc0R3ZyA/IChcbiAgICAgICAgICAgICAgICAgICAgPGltZ1xuICAgICAgICAgICAgICAgICAgICAgICAgc3JjPXtgL2FwaS9hcmNoaXZlL2ZpbGUvJHtpdGVtLmlkfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhbHQ9e2l0ZW0uZmlsZW5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb250YWluIHAtMlwiXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkVycm9yPXsoKSA9PiBzZXRJbWdFcnIodHJ1ZSl9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHRleHQtc3RvbmUtMjAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8UnVsZXIgc2l6ZT17MzZ9IHN0cm9rZVdpZHRoPXsxfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAge2lzRHdnICYmIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHRleHQtc3RvbmUtMzAwXCI+eyhpdGVtLmZpbGVfdHlwZXx8JycpLnRvVXBwZXJDYXNlKCl9PC9zcGFuPn1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgICAgIHsvKiBPdmVybGF5ICovfVxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBiZy1ibGFjay80MCBvcGFjaXR5LTAgZ3JvdXAtaG92ZXI6b3BhY2l0eS0xMDAgdHJhbnNpdGlvbi1vcGFjaXR5IGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHAtMlwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17ZSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IG9uT3BlbihpdGVtKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTMgcHktMS41IGJnLXdoaXRlIHRleHQtc3RvbmUtODAwIHRleHQtWzExcHhdIGZvbnQtYm9sZCByb3VuZGVkLWxnIHNoYWRvdyBob3ZlcjpiZy1zdG9uZS01MFwiXG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPEV5ZSBzaXplPXsxMn0gLz4gR8O2csO8bnTDvGxlXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtjYW5BbmFseXplICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2UgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBvblZlY3Rvcml6ZShpdGVtKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3ZlY3Rvcml6aW5nID09PSBpdGVtLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41IHB4LTMgcHktMS41IGJnLVsjMzc4QUREXSB0ZXh0LXdoaXRlIHRleHQtWzExcHhdIGZvbnQtYm9sZCByb3VuZGVkLWxnIHNoYWRvdyBob3ZlcjpiZy1bIzJhNmFiOF0gZGlzYWJsZWQ6b3BhY2l0eS02MFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dmVjdG9yaXppbmcgPT09IGl0ZW0uaWQgPyA8TG9hZGVyMiBzaXplPXsxMX0gY2xhc3NOYW1lPVwiYW5pbWF0ZS1zcGluXCIgLz4gOiA8U2NhbkxpbmUgc2l6ZT17MTF9IC8+fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBbmFsaXogRXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICB7bmVzdGluZ0lkICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtlID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgb25PcGVuTGlua2VkKG5lc3RpbmdJZCk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMiBweS0xIGJnLW9yYW5nZS01MDAgdGV4dC13aGl0ZSB0ZXh0LVsxMHB4XSBmb250LWJvbGQgcm91bmRlZC1sZyBzaGFkb3cgaG92ZXI6Ymctb3JhbmdlLTYwMCB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFNjaXNzb3JzIHNpemU9ezl9IC8+IE5lc3RpbmcgQcOnXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTIgbGVmdC0yXCI+XG4gICAgICAgICAgICAgICAgICAgIDxTdGF0dXNCYWRnZSBpdGVtPXtpdGVtfSAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTIgcmlnaHQtMiBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgICAgICAgICA8Q2FkQmFkZ2UgaXRlbT17aXRlbX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17ZSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IG9uRGV0YWlsKGl0ZW0pOyB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJEZXRheWxhcsSxIGfDtnN0ZXJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdy01IGgtNSByb3VuZGVkIGJnLXdoaXRlLzgwIHRleHQtc3RvbmUtNTAwIGhvdmVyOmJnLXdoaXRlIGhvdmVyOnRleHQtWyMzNzhBRERdIHNoYWRvdy1zbSB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxUYWJsZTIgc2l6ZT17MTF9IHN0cm9rZVdpZHRoPXsyLjV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHsvKiBCaWxnaSAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicHgtMy41IHB5LTMgZmxleC0xIGZsZXggZmxleC1jb2wgZ2FwLTEgbWluLXctMFwiPlxuICAgICAgICAgICAgICAgIHtpc1RSICYmIGJiLmNpemltX251bWFyYXNpICYmIChcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LWJsYWNrIHRleHQtWyMzNzhBRERdIHRyYWNraW5nLXdpZGVzdCB1cHBlcmNhc2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICN7YmIuY2l6aW1fbnVtYXJhc2l9XG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LVsxMnB4XSBmb250LWJvbGQgdGV4dC1zdG9uZS04MDAgdHJ1bmNhdGUgbGVhZGluZy1zbnVnXCI+XG4gICAgICAgICAgICAgICAgICAgIHsoaXNUUiAmJiBiYi5iYXNsaWspID8gYmIuYmFzbGlrIDogaXRlbS5maWxlbmFtZS5yZXBsYWNlKC9cXC5bXi5dKyQvLCAnJyl9XG4gICAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgICAgICB7aXNUUiAmJiAoXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LXdyYXAgZ2FwLTEgbXQtMC41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7YmIucmV2aXp5b24gJiYgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBiZy1zdG9uZS0xMDAgdGV4dC1zdG9uZS01MDAgcHgtMS41IHB5LTAuNSByb3VuZGVkIGZvbnQtbWVkaXVtXCI+UmV2IHtiYi5yZXZpenlvbn08L3NwYW4+fVxuICAgICAgICAgICAgICAgICAgICAgICAge2JiLm9sY2VrICAgICYmIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gYmctc3RvbmUtMTAwIHRleHQtc3RvbmUtNTAwIHB4LTEuNSBweS0wLjUgcm91bmRlZCBmb250LW1lZGl1bVwiPntiYi5vbGNla308L3NwYW4+fVxuICAgICAgICAgICAgICAgICAgICAgICAge2JiLm1hbHplbWUgICYmIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gYmctc3RvbmUtMTAwIHRleHQtc3RvbmUtNTAwIHB4LTEuNSBweS0wLjUgcm91bmRlZCBmb250LW1lZGl1bVwiPntiYi5tYWx6ZW1lfTwvc3Bhbj59XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgICAgICB7LyogT3RvbWF0aWsgZcWfbGXFn21lIGJhbmTEsSAqL31cbiAgICAgICAgICAgICAgICB7bmVzdGluZ0lkICYmIG5lc3RpbmdNYXROdW0gJiYgKFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHB4LTIgcHktMSBiZy1vcmFuZ2UtNTAgYm9yZGVyIGJvcmRlci1vcmFuZ2UtMTAwIHJvdW5kZWQtbGcgbXQtMVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPExpbmsyIHNpemU9ezl9IGNsYXNzTmFtZT1cInRleHQtb3JhbmdlLTQwMCBzaHJpbmstMFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtb3JhbmdlLTUwMCBmb250LWJvbGQgdHJ1bmNhdGVcIj57bmVzdGluZ01hdE51bX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgICAgICB7LyogQmHEn2xhbnTEsSBkdXJ1bXUgKyBhbHQgYmlsZ2kgKi99XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC1hdXRvIHB0LTIgYm9yZGVyLXQgYm9yZGVyLXN0b25lLTUwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMlwiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+XG4gICAgICAgICAgICAgICAgICAgIDxMaW5rU3RhdHVzIGl0ZW09e2l0ZW19IG9uVW5saW5rPXtvblVubGlua30gb25TdGFydExpbms9e29uU3RhcnRMaW5rfSAvPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIHRleHQtWzEwcHhdIHRleHQtc3RvbmUtMzAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ1cHBlcmNhc2UgZm9udC1ibGFja1wiPntpdGVtLmZpbGVfdHlwZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICB7Zm10U2l6ZShpdGVtLmZpbGVfc2l6ZSkgJiYgPHNwYW4+wrcge2ZtdFNpemUoaXRlbS5maWxlX3NpemUpfTwvc3Bhbj59XG4gICAgICAgICAgICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhyZWY9e2AvYXBpL2FyY2hpdmUvZG93bmxvYWQvJHtpdGVtLmlkfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17ZSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cIm1sLTEgdGV4dC1zdG9uZS0zMDAgaG92ZXI6dGV4dC1bIzM3OEFERF0gdHJhbnNpdGlvbi1jb2xvcnNcIlxuICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxEb3dubG9hZCBzaXplPXsxMX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvPlxuICAgICk7XG59XG5cbi8qIOKUgOKUgCBMaXN0ZSBzYXTEsXLEsSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmNvbnN0IExDT0xTID0geyBncmlkVGVtcGxhdGVDb2x1bW5zOiAnbWlubWF4KDAsMS4yZnIpIG1pbm1heCgwLDAuOGZyKSBtaW5tYXgoMCwwLjlmcikgODBweCA4MHB4IDgwcHggMTAwcHggMTEwcHggMTEwcHggNjBweCcgfTtcblxuZnVuY3Rpb24gTGlzdEhlYWRlcigpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTMgcHgtNCBweS0yIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdHJhY2tpbmctd2lkZXN0IHVwcGVyY2FzZSB0ZXh0LXN0b25lLTQwMCBib3JkZXItYiBib3JkZXItc3RvbmUtMTAwIGJnLXdoaXRlXCIgc3R5bGU9e0xDT0xTfT5cbiAgICAgICAgICAgIDxzcGFuPkRPU1lBIEFESTwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuPsOHxLBaxLBNIE5PPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+QkHFnkxJSzwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuPlJFVsSwWllPTjwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuPsOWTMOHRUs8L3NwYW4+XG4gICAgICAgICAgICA8c3Bhbj5UxLBQPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+RFVSVU08L3NwYW4+XG4gICAgICAgICAgICA8c3Bhbj5CT1lVVDwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuPlRBUsSwSDwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG5cbmZ1bmN0aW9uIExpc3RSb3coeyBpdGVtLCBvbk9wZW4sIG9uVmVjdG9yaXplLCB2ZWN0b3JpemluZywgb25PcGVuTGlua2VkLCBvblN0YXJ0TGluaywgb25VbmxpbmssIG9uRGV0YWlsLCBvbkRlbGV0ZSB9KSB7XG4gICAgY29uc3QgW2N0eE1lbnUsIHNldEN0eE1lbnVdID0gdXNlU3RhdGUobnVsbCk7XG4gICAgY29uc3QgdmEgPSBpdGVtLm1ldGE/LnZpc2lvbl9hbmFseXNpcztcbiAgICBjb25zdCBpc1RSID0gdmE/LmltYWdlX3R5cGUgPT09ICd0ZWtuaWtfcmVzaW0nO1xuICAgIGNvbnN0IGJiID0gaXNUUiA/ICh2YS5iYXNsaWtfYmxva3UgfHwge30pIDoge307XG4gICAgY29uc3QgY2FuQW5hbHl6ZSA9ICF2YSAmJiBpdGVtLm1ldGE/LnRyYW5zY3JpcHRpb25fc3RhdHVzICE9PSAncHJvY2Vzc2luZyc7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8PlxuICAgICAgICB7Y3R4TWVudSAmJiAoXG4gICAgICAgICAgICA8Q29udGV4dE1lbnVcbiAgICAgICAgICAgICAgICB4PXtjdHhNZW51Lnh9IHk9e2N0eE1lbnUueX1cbiAgICAgICAgICAgICAgICBpdGVtPXtpdGVtfVxuICAgICAgICAgICAgICAgIG9uRGVsZXRlPXtvbkRlbGV0ZX1cbiAgICAgICAgICAgICAgICBvbkNsb3NlPXsoKSA9PiBzZXRDdHhNZW51KG51bGwpfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgKX1cbiAgICAgICAgPGRpdlxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25PcGVuKGl0ZW0pfVxuICAgICAgICAgICAgb25Db250ZXh0TWVudT17ZSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgc2V0Q3R4TWVudSh7IHg6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZIH0pOyB9fVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiZ3JvdXAgZ3JpZCBnYXAtMyBweC00IHB5LTIuNSBpdGVtcy1jZW50ZXIgYmctd2hpdGUgaG92ZXI6Ymctc3RvbmUtNTAgYm9yZGVyLWIgYm9yZGVyLXN0b25lLTEwMCBjdXJzb3ItcG9pbnRlciB0cmFuc2l0aW9uLWNvbG9yc1wiXG4gICAgICAgICAgICBzdHlsZT17TENPTFN9XG4gICAgICAgID5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgbWluLXctMFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNocmluay0wIHRleHQtWzlweF0gZm9udC1ibGFjayBweC0xLjUgcHktMC41IHJvdW5kZWQgdGV4dC13aGl0ZSB1cHBlcmNhc2VcIiBzdHlsZT17eyBiYWNrZ3JvdW5kOiAnIzhiNWNmNicgfX0+XG4gICAgICAgICAgICAgICAgICAgIHsoaXRlbS5maWxlX3R5cGUgfHwgJ0lNRycpLnNsaWNlKDAsIDQpLnRvVXBwZXJDYXNlKCl9XG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGQgdGV4dC1zdG9uZS04MDAgdHJ1bmNhdGVcIj57aXRlbS5maWxlbmFtZS5yZXBsYWNlKC9cXC5bXi5dKyQvLCAnJyl9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LVsjMzc4QUREXSBmb250LWJvbGQgdHJ1bmNhdGVcIj57YmIuY2l6aW1fbnVtYXJhc2kgfHwgJ+KAlCd9PC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zdG9uZS02MDAgdHJ1bmNhdGVcIj57YmIuYmFzbGlrIHx8ICfigJQnfTwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIHRleHQtc3RvbmUtNTAwXCI+e2JiLnJldml6eW9uIHx8ICfigJQnfTwvc3Bhbj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIHRleHQtc3RvbmUtNTAwXCI+e2JiLm9sY2VrIHx8ICfigJQnfTwvc3Bhbj5cbiAgICAgICAgICAgIDxkaXYgb25DbGljaz17ZSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpfT5cbiAgICAgICAgICAgICAgICA8TGlua1N0YXR1cyBpdGVtPXtpdGVtfSBvblVubGluaz17b25Vbmxpbmt9IG9uU3RhcnRMaW5rPXtvblN0YXJ0TGlua30gLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPFN0YXR1c0JhZGdlIGl0ZW09e2l0ZW19IC8+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LXN0b25lLTUwMFwiPntmbXRTaXplKGl0ZW0uZmlsZV9zaXplKSB8fCAn4oCUJ308L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LVsjMzc4QUREXSBmb250LXNlbWlib2xkXCI+e2ZtdERhdGUoaXRlbS5jcmVhdGVkX2F0KX08L3NwYW4+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIG9wYWNpdHktMCBncm91cC1ob3ZlcjpvcGFjaXR5LTEwMCB0cmFuc2l0aW9uLW9wYWNpdHlcIj5cbiAgICAgICAgICAgICAgICB7Y2FuQW5hbHl6ZSAmJiAoXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2UgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBvblZlY3Rvcml6ZShpdGVtKTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXt2ZWN0b3JpemluZyA9PT0gaXRlbS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiQW5hbGl6IEV0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMSByb3VuZGVkIHRleHQtc3RvbmUtNDAwIGhvdmVyOnRleHQtWyMzNzhBRERdIGhvdmVyOmJnLVsjMzc4QUREXS8xMCB0cmFuc2l0aW9uLWFsbFwiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHt2ZWN0b3JpemluZyA9PT0gaXRlbS5pZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gPExvYWRlcjIgc2l6ZT17MTJ9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpblwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiA8U2NhbkxpbmUgc2l6ZT17MTJ9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtlID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgb25EZXRhaWwoaXRlbSk7IH19XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRGV0YXlsYXLEsSBnw7ZzdGVyXCJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0xIHJvdW5kZWQgdGV4dC1zdG9uZS00MDAgaG92ZXI6dGV4dC1bIzM3OEFERF0gaG92ZXI6YmctWyMzNzhBRERdLzEwIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxUYWJsZTIgc2l6ZT17MTJ9IC8+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgICAgICAgaHJlZj17YC9hcGkvYXJjaGl2ZS9kb3dubG9hZC8ke2l0ZW0uaWR9YH1cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17ZSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwLTEgcm91bmRlZCB0ZXh0LXN0b25lLTQwMCBob3Zlcjp0ZXh0LVsjMzc4QUREXSBob3ZlcjpiZy1bIzM3OEFERF0vMTAgdHJhbnNpdGlvbi1hbGxcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPERvd25sb2FkIHNpemU9ezEyfSAvPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC8+XG4gICAgKTtcbn1cblxuLyog4pSA4pSAIEZpbHRyZWxlciDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmNvbnN0IEZJTFRFUlMgPSBbXG4gICAgeyBrZXk6ICdhbGwnLCAgICAgIGxhYmVsOiAnVMO8bcO8JyB9LFxuICAgIHsga2V5OiAnY2FkJywgICAgICBsYWJlbDogJ0NBRCcsICAgICAgICAgICBpY29uOiBDcHUgfSxcbiAgICB7IGtleTogJ25lc3RpbmcnLCAgbGFiZWw6ICdOZXN0aW5nJywgICAgICAgIGljb246IFNjaXNzb3JzIH0sXG4gICAgeyBrZXk6ICdhbmFseXplZCcsIGxhYmVsOiAnQW5hbGl6IEVkaWxkaScsIGljb246IENoZWNrQ2lyY2xlMiB9LFxuICAgIHsga2V5OiAncGVuZGluZycsICBsYWJlbDogJ0Jla2xleWVubGVyJywgICBpY29uOiBDbG9jayB9LFxuXTtcblxuLyog4pSA4pSAIEFuYSBiaWxlxZ9lbiDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFRla25pa1Jlc2ltVmlld2VyKHsgb25PcGVuRmlsZSB9KSB7XG4gICAgY29uc3QgW2l0ZW1zLCAgICAgIHNldEl0ZW1zXSAgICAgID0gdXNlU3RhdGUoW10pO1xuICAgIGNvbnN0IFtsb2FkaW5nLCAgICBzZXRMb2FkaW5nXSAgICA9IHVzZVN0YXRlKHRydWUpO1xuICAgIGNvbnN0IFtzZWFyY2gsICAgICBzZXRTZWFyY2hdICAgICA9IHVzZVN0YXRlKCcnKTtcbiAgICBjb25zdCBbZmlsdGVyLCAgICAgc2V0RmlsdGVyXSAgICAgPSB1c2VTdGF0ZSgnYWxsJyk7XG4gICAgY29uc3QgW3ZpZXcsICAgICAgIHNldFZpZXddICAgICAgID0gdXNlU3RhdGUoJ2dyaWQnKTtcbiAgICBjb25zdCBbdmVjdG9yaXppbmcsICBzZXRWZWN0b3JpemluZ10gID0gdXNlU3RhdGUobnVsbCk7XG4gICAgY29uc3QgW3VwbG9hZE1vZGFsLCAgc2V0VXBsb2FkTW9kYWxdICA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgICBjb25zdCBbbGlua01vZGFsLCAgICBzZXRMaW5rTW9kYWxdICAgID0gdXNlU3RhdGUobnVsbCk7XG4gICAgY29uc3QgW2RldGFpbEl0ZW0sICAgc2V0RGV0YWlsSXRlbV0gICA9IHVzZVN0YXRlKG51bGwpO1xuXG4gICAgY29uc3QgbG9hZCA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgc2V0TG9hZGluZyh0cnVlKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKCcvYXBpL2FyY2hpdmUvbGlzdCcpO1xuICAgICAgICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IFRFS05JS19FWFRTID0gbmV3IFNldChbJ3BuZycsJ2pwZycsJ2pwZWcnLCd3ZWJwJywnYm1wJywnZ2lmJywndGlmZicsJ3BkZicsJ2R3ZycsJ2R4ZicsJ3N0cCcsJ3N0ZXAnXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaW1ncyA9IChkYXRhLml0ZW1zIHx8IFtdKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGkgPT4gVEVLTklLX0VYVFMuaGFzKChpLmZpbGVfdHlwZSB8fCAnJykudG9Mb3dlckNhc2UoKSkpXG4gICAgICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBuZXcgRGF0ZShiLmNyZWF0ZWRfYXQpIC0gbmV3IERhdGUoYS5jcmVhdGVkX2F0KSk7XG4gICAgICAgICAgICAgICAgc2V0SXRlbXMoaW1ncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgZmluYWxseSB7IHNldExvYWRpbmcoZmFsc2UpOyB9XG4gICAgfSwgW10pO1xuXG4gICAgdXNlRWZmZWN0KCgpID0+IHsgbG9hZCgpOyB9LCBbbG9hZF0pO1xuXG4gICAgLyogUG9sbGluZzogacWfbGVtZGVraSBkb3N5YWxhcsSxIGtvbnRyb2wgZXQgKi9cbiAgICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgICAgICBjb25zdCBwcm9jZXNzaW5nID0gaXRlbXMuZmlsdGVyKGkgPT4gaS5tZXRhPy50cmFuc2NyaXB0aW9uX3N0YXR1cyA9PT0gJ3Byb2Nlc3NpbmcnKTtcbiAgICAgICAgaWYgKCFwcm9jZXNzaW5nLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICBjb25zdCB0ID0gc2V0VGltZW91dChsb2FkLCA0MDAwKTtcbiAgICAgICAgcmV0dXJuICgpID0+IGNsZWFyVGltZW91dCh0KTtcbiAgICB9LCBbaXRlbXMsIGxvYWRdKTtcblxuICAgIGNvbnN0IGZpbHRlcmVkID0gaXRlbXMuZmlsdGVyKGkgPT4ge1xuICAgICAgICAvLyBCYcSfbMSxIG5lc3Rpbmcgw6dvY3VrbGFyxLEgYW5hIGthcnR0YW4gZXJpxZ9pbGViaWxpciwgYXlyxLFjYSBnw7ZzdGVybWVcbiAgICAgICAgaWYgKGkubWV0YT8uYmFnbGlfZG9zeWFsYXI/LmNpemltKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChzZWFyY2gudHJpbSgpICYmICFpLmZpbGVuYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoLnRvTG93ZXJDYXNlKCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGNvbnN0IHZhID0gaS5tZXRhPy52aXNpb25fYW5hbHlzaXM7XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IGkubWV0YT8udHJhbnNjcmlwdGlvbl9zdGF0dXM7XG4gICAgICAgIGlmIChmaWx0ZXIgPT09ICdjYWQnKSAgICAgIHJldHVybiBpLm1ldGE/LmNhZF90dXJ1ID09PSAnY2FkJztcbiAgICAgICAgaWYgKGZpbHRlciA9PT0gJ25lc3RpbmcnKSAgcmV0dXJuIGkubWV0YT8uY2FkX3R1cnUgPT09ICduZXN0aW5nJztcbiAgICAgICAgaWYgKGZpbHRlciA9PT0gJ2FuYWx5emVkJykgcmV0dXJuICEhdmE7XG4gICAgICAgIGlmIChmaWx0ZXIgPT09ICdwZW5kaW5nJykgIHJldHVybiAhdmEgJiYgc3RhdHVzICE9PSAncHJvY2Vzc2luZyc7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gICAgY29uc3QgY291bnRzID0ge1xuICAgICAgICBhbGw6ICAgICAgaXRlbXMubGVuZ3RoLFxuICAgICAgICBjYWQ6ICAgICAgaXRlbXMuZmlsdGVyKGkgPT4gaS5tZXRhPy5jYWRfdHVydSA9PT0gJ2NhZCcpLmxlbmd0aCxcbiAgICAgICAgbmVzdGluZzogIGl0ZW1zLmZpbHRlcihpID0+IGkubWV0YT8uY2FkX3R1cnUgPT09ICduZXN0aW5nJykubGVuZ3RoLFxuICAgICAgICBhbmFseXplZDogaXRlbXMuZmlsdGVyKGkgPT4gISFpLm1ldGE/LnZpc2lvbl9hbmFseXNpcykubGVuZ3RoLFxuICAgICAgICBwZW5kaW5nOiAgaXRlbXMuZmlsdGVyKGkgPT4gIWkubWV0YT8udmlzaW9uX2FuYWx5c2lzICYmIGkubWV0YT8udHJhbnNjcmlwdGlvbl9zdGF0dXMgIT09ICdwcm9jZXNzaW5nJykubGVuZ3RoLFxuICAgIH07XG5cbiAgICBjb25zdCBoYW5kbGVPcGVuID0gKGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKCFvbk9wZW5GaWxlKSByZXR1cm47XG4gICAgICAgIG9uT3BlbkZpbGUoe1xuICAgICAgICAgICAgaWQ6ICAgIGBpbWctJHtpdGVtLmlkfWAsXG4gICAgICAgICAgICB0aXRsZTogaXRlbS5maWxlbmFtZSxcbiAgICAgICAgICAgIHR5cGU6ICAnaW1hZ2Utdmlld2VyJyxcbiAgICAgICAgICAgIHVybDogICBgL2FwaS9hcmNoaXZlL2ZpbGUvJHtpdGVtLmlkfWAsXG4gICAgICAgICAgICBtZXRhOiAgeyBkb2NJZDogaXRlbS5pZCB9LFxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgaGFuZGxlT3BlbkxpbmtlZCA9IHVzZUNhbGxiYWNrKChsaW5rZWRJZCkgPT4ge1xuICAgICAgICBpZiAoIW9uT3BlbkZpbGUpIHJldHVybjtcbiAgICAgICAgLy8gQmHEn2zEsSBkb3N5YW7EsW4gbWV0YSdzxLFuxLEgaXRlbXMndGFuIGJ1bDsgeW9rc2EgZ2VuZWwgYmlyIHRhYiBhw6dcbiAgICAgICAgY29uc3QgbGlua2VkID0gaXRlbXMuZmluZChpID0+IGkuaWQgPT09IGxpbmtlZElkKTtcbiAgICAgICAgY29uc3QgZXh0ID0gbGlua2VkPy5maWxlX3R5cGUgfHwgJyc7XG4gICAgICAgIGNvbnN0IElNQUdFX0VYVCA9IG5ldyBTZXQoWydwbmcnLCdqcGcnLCdqcGVnJywnd2VicCcsJ2JtcCcsJ2dpZicsJ3RpZmYnXSk7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBJTUFHRV9FWFQuaGFzKGV4dCkgPyAnaW1hZ2Utdmlld2VyJ1xuICAgICAgICAgICAgOiBbJ3BkZiddLmluY2x1ZGVzKGV4dCkgPyAncGRmJ1xuICAgICAgICAgICAgOiBbJ2RvY3gnLCdkb2MnXS5pbmNsdWRlcyhleHQpID8gJ2RvY3gnXG4gICAgICAgICAgICA6IFsneGxzeCcsJ3hscyddLmluY2x1ZGVzKGV4dCkgPyAneGxzJ1xuICAgICAgICAgICAgOiAnYXJjaGl2ZS1kb2NzJztcbiAgICAgICAgb25PcGVuRmlsZSh7XG4gICAgICAgICAgICBpZDogICAgYGxpbmtlZC0ke2xpbmtlZElkfWAsXG4gICAgICAgICAgICB0aXRsZTogbGlua2VkPy5maWxlbmFtZSB8fCAnQmHEn2zEsSBEb3N5YScsXG4gICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgdXJsOiAgIGAvYXBpL2FyY2hpdmUvZmlsZS8ke2xpbmtlZElkfWAsXG4gICAgICAgICAgICBtZXRhOiAgeyBkb2NJZDogbGlua2VkSWQgfSxcbiAgICAgICAgfSk7XG4gICAgfSwgW2l0ZW1zLCBvbk9wZW5GaWxlXSk7XG5cbiAgICBjb25zdCBoYW5kbGVVbmxpbmsgPSB1c2VDYWxsYmFjayhhc3luYyAoc291cmNlSWQsIGxpbmtUeXBlKSA9PiB7XG4gICAgICAgIGF3YWl0IGZldGNoKGAvYXBpL2FyY2hpdmUvbGluaz9zb3VyY2VfaWQ9JHtzb3VyY2VJZH0mbGlua190eXBlPSR7bGlua1R5cGV9YCwgeyBtZXRob2Q6ICdERUxFVEUnIH0pO1xuICAgICAgICBsb2FkKCk7XG4gICAgfSwgW2xvYWRdKTtcblxuICAgIGNvbnN0IGhhbmRsZVZlY3Rvcml6ZSA9IGFzeW5jIChpdGVtKSA9PiB7XG4gICAgICAgIHNldFZlY3Rvcml6aW5nKGl0ZW0uaWQpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYC9hcGkvYXJjaGl2ZS92ZWN0b3JpemUvJHtpdGVtLmlkfWAsIHsgbWV0aG9kOiAnUE9TVCcgfSk7XG4gICAgICAgICAgICBpZiAocmVzLm9rKSBzdWJzY3JpYmVUb0RvY1Byb2dyZXNzKGl0ZW0uaWQsIGl0ZW0uZmlsZW5hbWUsIGxvYWQpO1xuICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIGZpbmFsbHkgeyBzZXRWZWN0b3JpemluZyhudWxsKTsgfVxuICAgIH07XG5cbiAgICBjb25zdCBoYW5kbGVEZWxldGUgPSB1c2VDYWxsYmFjayhhc3luYyAoaXRlbSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZmV0Y2goYC9hcGkvYXJjaGl2ZS9kb2N1bWVudHMvJHtpdGVtLmlkfWAsIHsgbWV0aG9kOiAnREVMRVRFJyB9KTtcbiAgICAgICAgICAgIGxvYWQoKTtcbiAgICAgICAgfSBjYXRjaCB7fVxuICAgIH0sIFtsb2FkXSk7XG5cbiAgICBjb25zdCBwcm9jZXNzaW5nQ291bnQgPSBpdGVtcy5maWx0ZXIoaSA9PiBpLm1ldGE/LnRyYW5zY3JpcHRpb25fc3RhdHVzID09PSAncHJvY2Vzc2luZycpLmxlbmd0aDtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDw+XG4gICAgICAgIHtkZXRhaWxJdGVtICYmIChcbiAgICAgICAgICAgIDxEYXRhVGFibGVNb2RhbFxuICAgICAgICAgICAgICAgIGl0ZW09e2l0ZW1zLmZpbmQoaSA9PiBpLmlkID09PSBkZXRhaWxJdGVtLmlkKSB8fCBkZXRhaWxJdGVtfVxuICAgICAgICAgICAgICAgIGFsbEl0ZW1zPXtpdGVtc31cbiAgICAgICAgICAgICAgICBvbkNsb3NlPXsoKSA9PiBzZXREZXRhaWxJdGVtKG51bGwpfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgKX1cbiAgICAgICAge3VwbG9hZE1vZGFsICYmIChcbiAgICAgICAgICAgIDxVcGxvYWRNb2RhbCBvbkNsb3NlPXsoKSA9PiBzZXRVcGxvYWRNb2RhbChmYWxzZSl9IG9uVXBsb2FkZWQ9e2xvYWR9IG9uQW5hbHlzaXNEb25lPXtsb2FkfSAvPlxuICAgICAgICApfVxuICAgICAgICB7bGlua01vZGFsICYmIChcbiAgICAgICAgICAgIDxMaW5rTW9kYWxcbiAgICAgICAgICAgICAgICBzb3VyY2VJdGVtPXtsaW5rTW9kYWwuaXRlbX1cbiAgICAgICAgICAgICAgICBsaW5rVHlwZT17bGlua01vZGFsLmxpbmtUeXBlfVxuICAgICAgICAgICAgICAgIG9uQ2xvc2U9eygpID0+IHNldExpbmtNb2RhbChudWxsKX1cbiAgICAgICAgICAgICAgICBvbkxpbmtlZD17bG9hZH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICl9XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBoLWZ1bGwgdy1mdWxsIGJnLXN0b25lLTUwIGZvbnQtc2FucyBvdmVyZmxvdy1oaWRkZW5cIj5cblxuICAgICAgICAgICAgey8qIOKUgOKUgCBCQcWeTElLIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL31cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC1ub25lIGJnLXdoaXRlIGJvcmRlci1iIGJvcmRlci1zdG9uZS0yMDBcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNCBweC03IHB0LTYgcGItNFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC00XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtMyBiZy1bIzM3OEFERF0vMTAgcm91bmRlZC0yeGwgc2hyaW5rLTAgcmVsYXRpdmVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8UnVsZXIgc2l6ZT17MjJ9IGNsYXNzTmFtZT1cInRleHQtWyMzNzhBRERdXCIgc3Ryb2tlV2lkdGg9ezJ9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3Byb2Nlc3NpbmdDb3VudCA+IDAgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTEgLXJpZ2h0LTEgdy00IGgtNCBiZy1hbWJlci00MDAgdGV4dC13aGl0ZSB0ZXh0LVs4cHhdIGZvbnQtYmxhY2sgcm91bmRlZC1mdWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cHJvY2Vzc2luZ0NvdW50fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LVsyMHB4XSBmb250LWJsYWNrIHRleHQtc3RvbmUtOTAwIHRyYWNraW5nLXRpZ2h0XCI+VGVrbmlrIFJlc2ltbGVyPC9oMT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gZm9udC1ib2xkIGJnLXN0b25lLTEwMCB0ZXh0LXN0b25lLTUwMCBweC0yIHB5LTAuNSByb3VuZGVkLWZ1bGwgdGFidWxhci1udW1zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aXRlbXMubGVuZ3RofVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb3VudHMudGVrbmlrID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSBmb250LWJvbGQgYmctZW1lcmFsZC01MCB0ZXh0LWVtZXJhbGQtNjAwIHB4LTIgcHktMC41IHJvdW5kZWQtZnVsbCB0YWJ1bGFyLW51bXMgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTIwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb3VudHMudGVrbmlrfSBhbmFsaXpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LXN0b25lLTQwMCBmb250LW1lZGl1bSBtdC0wLjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTcO8aGVuZGlzbGlrIMOnaXppbWxlcmksIGltYWxhdCByZXNpbWxlcmksIHRla25payDFn2VtYWxhclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHNocmluay0wXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17bG9hZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwLTIgcm91bmRlZC14bCBiZy1zdG9uZS0xMDAgdGV4dC1zdG9uZS01MDAgaG92ZXI6Ymctc3RvbmUtMjAwIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIlllbmlsZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFJlZnJlc2hDdyBzaXplPXsxNH0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VXBsb2FkTW9kYWwodHJ1ZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBweC00IHB5LTIgYmctWyMzNzhBRERdIHRleHQtd2hpdGUgdGV4dC1bMTJweF0gZm9udC1ib2xkIHJvdW5kZWQteGwgaG92ZXI6YmctWyMyYTZhYjhdIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VXBsb2FkIHNpemU9ezE0fSAvPiBZw7xrbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIHsvKiBGaWx0cmVsZXIgKyBBcmFtYSAqL31cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHB4LTcgcGItNFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJlbGF0aXZlIHctWzMyMHB4XSBzaHJpbmstMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPFNlYXJjaCBzaXplPXsxM30gY2xhc3NOYW1lPVwiYWJzb2x1dGUgbGVmdC0zIHRvcC0xLzIgLXRyYW5zbGF0ZS15LTEvMiB0ZXh0LXN0b25lLTQwMCBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtzZWFyY2h9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9e2UgPT4gc2V0U2VhcmNoKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIsOnaXppbSBhZMSxLCBudW1hcmFzxLEsIGJhxZ9sxLFrLi4uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgcGwtOCBwci0xMCBweS0yIGJnLXN0b25lLTUwIGJvcmRlciBib3JkZXItc3RvbmUtMjAwIHJvdW5kZWQtbGcgdGV4dC1bMTFweF0gdGV4dC1zdG9uZS03MDAgcGxhY2Vob2xkZXI6dGV4dC1zdG9uZS00MDAgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOmJnLXdoaXRlIGZvY3VzOmJvcmRlci1bIzM3OEFERF0gZm9jdXM6cmluZy0xIGZvY3VzOnJpbmctWyMzNzhBRERdLzIwIHRyYW5zaXRpb24tYWxsXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICB7c2VhcmNoICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFNlYXJjaCgnJyl9IGNsYXNzTmFtZT1cImFic29sdXRlIHJpZ2h0LTIuNSB0b3AtMS8yIC10cmFuc2xhdGUteS0xLzIgdGV4dC1zdG9uZS00MDAgaG92ZXI6dGV4dC1zdG9uZS02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFggc2l6ZT17MTF9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0wLjUgbWwtYXV0b1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAge0ZJTFRFUlMubWFwKGYgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtmLmtleX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0RmlsdGVyKGYua2V5KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEgcHgtMi41IHB5LTEuNSByb3VuZGVkLWxnIHRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGQgd2hpdGVzcGFjZS1ub3dyYXAgdHJhbnNpdGlvbi1hbGwgc2hyaW5rLTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZmlsdGVyID09PSBmLmtleSA/ICdiZy1bIzM3OEFERF0vMTAgdGV4dC1bIzM3OEFERF0nIDogJ3RleHQtc3RvbmUtNTAwIGhvdmVyOnRleHQtc3RvbmUtNzAwIGhvdmVyOmJnLXN0b25lLTEwMCd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtmLmljb24gJiYgPGYuaWNvbiBzaXplPXsxMX0gc3Ryb2tlV2lkdGg9ezJ9IC8+fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Zi5sYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPXtgdGV4dC1bMTBweF0gZm9udC1ib2xkIHRhYnVsYXItbnVtcyAke2ZpbHRlciA9PT0gZi5rZXkgPyAndGV4dC1bIzM3OEFERF0nIDogJ3RleHQtc3RvbmUtNDAwJ31gfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb3VudHNbZi5rZXldfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1weCBoLTQgYmctc3RvbmUtMjAwIG14LTEgc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRWaWV3KCdsaXN0Jyl9IGNsYXNzTmFtZT17YHAtMS41IHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGwgJHt2aWV3ID09PSAnbGlzdCcgPyAnYmctc3RvbmUtMTAwIHRleHQtc3RvbmUtNzAwJyA6ICd0ZXh0LXN0b25lLTQwMCBob3ZlcjpiZy1zdG9uZS0xMDAnfWB9PjxMaXN0IHNpemU9ezE0fSAvPjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRWaWV3KCdncmlkJyl9IGNsYXNzTmFtZT17YHAtMS41IHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGwgJHt2aWV3ID09PSAnZ3JpZCcgPyAnYmctc3RvbmUtMTAwIHRleHQtc3RvbmUtNzAwJyA6ICd0ZXh0LXN0b25lLTQwMCBob3ZlcjpiZy1zdG9uZS0xMDAnfWB9PjxHcmlkIHNpemU9ezE0fSAvPjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICB7Lyog4pSA4pSAIMSww4dFUsSwSyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi99XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgtMSBvdmVyZmxvdy15LWF1dG8gcC02IG1pbmltYWwtc2Nyb2xsXCI+XG4gICAgICAgICAgICAgICAge2xvYWRpbmcgPyAoXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgaC00OCBnYXAtMiB0ZXh0LXN0b25lLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPExvYWRlcjIgc2l6ZT17MjB9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpbiB0ZXh0LVsjMzc4QUREXVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMnB4XSBmb250LW1lZGl1bVwiPlnDvGtsZW5peW9yLi4uPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApIDogZmlsdGVyZWQubGVuZ3RoID09PSAwID8gKFxuICAgICAgICAgICAgICAgICAgICA8RW1wdHlTdGF0ZSBzZWFyY2g9e3NlYXJjaH0gZmlsdGVyPXtmaWx0ZXJ9IG9uVXBsb2FkPXsoKSA9PiBzZXRVcGxvYWRNb2RhbCh0cnVlKX0gLz5cbiAgICAgICAgICAgICAgICApIDogdmlldyA9PT0gJ2dyaWQnID8gKFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTQgeGw6Z3JpZC1jb2xzLTMgMnhsOmdyaWQtY29scy00XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmlsdGVyZWQubWFwKGl0ZW0gPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUZWtuaWtLYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17aXRlbS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbT17aXRlbX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsSXRlbXM9e2l0ZW1zfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbk9wZW49e2hhbmRsZU9wZW59XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uVmVjdG9yaXplPXtoYW5kbGVWZWN0b3JpemV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlY3Rvcml6aW5nPXt2ZWN0b3JpemluZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25PcGVuTGlua2VkPXtoYW5kbGVPcGVuTGlua2VkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblN0YXJ0TGluaz17KGl0LCBsdCkgPT4gc2V0TGlua01vZGFsKHsgaXRlbTogaXQsIGxpbmtUeXBlOiBsdCB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Vbmxpbms9e2hhbmRsZVVubGlua31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EZXRhaWw9e3NldERldGFpbEl0ZW19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRGVsZXRlPXtoYW5kbGVEZWxldGV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIGJvcmRlciBib3JkZXItc3RvbmUtMjAwIHJvdW5kZWQteGwgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8TGlzdEhlYWRlciAvPlxuICAgICAgICAgICAgICAgICAgICAgICAge2ZpbHRlcmVkLm1hcChpdGVtID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8TGlzdFJvd1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2l0ZW0uaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW09e2l0ZW19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uT3Blbj17aGFuZGxlT3Blbn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25WZWN0b3JpemU9e2hhbmRsZVZlY3Rvcml6ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVjdG9yaXppbmc9e3ZlY3Rvcml6aW5nfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbk9wZW5MaW5rZWQ9e2hhbmRsZU9wZW5MaW5rZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uU3RhcnRMaW5rPXsoaXQsIGx0KSA9PiBzZXRMaW5rTW9kYWwoeyBpdGVtOiBpdCwgbGlua1R5cGU6IGx0IH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblVubGluaz17aGFuZGxlVW5saW5rfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRldGFpbD17c2V0RGV0YWlsSXRlbX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EZWxldGU9e2hhbmRsZURlbGV0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvPlxuICAgICk7XG59XG5cbi8qIOKUgOKUgCBCb8WfIGR1cnVtIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqL1xuZnVuY3Rpb24gRW1wdHlTdGF0ZSh7IHNlYXJjaCwgZmlsdGVyLCBvblVwbG9hZCB9KSB7XG4gICAgaWYgKHNlYXJjaCkge1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBoLTQ4IGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgPFNlYXJjaCBzaXplPXszNn0gc3Ryb2tlV2lkdGg9ezF9IGNsYXNzTmFtZT1cInRleHQtc3RvbmUtMzAwXCIgLz5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMnB4XSBmb250LXNlbWlib2xkIHRleHQtc3RvbmUtNDAwXCI+XCJ7c2VhcmNofVwiIGlsZSBlxZ9sZcWfZW4gcmVzaW0gYnVsdW5hbWFkxLE8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGZpbHRlciAhPT0gJ2FsbCcpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgaC00OCBnYXAtM1wiPlxuICAgICAgICAgICAgICAgIDxMYXllcnMgc2l6ZT17MzZ9IHN0cm9rZVdpZHRoPXsxfSBjbGFzc05hbWU9XCJ0ZXh0LXN0b25lLTMwMFwiIC8+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bMTJweF0gZm9udC1zZW1pYm9sZCB0ZXh0LXN0b25lLTQwMFwiPkJ1IGZpbHRyZWRlIGthecSxdCB5b2s8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBoLTY0IGdhcC00XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInAtNSBiZy1bIzM3OEFERF0vOCByb3VuZGVkLTN4bCBib3JkZXItMiBib3JkZXItZGFzaGVkIGJvcmRlci1bIzM3OEFERF0vMjBcIj5cbiAgICAgICAgICAgICAgICA8UnVsZXIgc2l6ZT17NDR9IHN0cm9rZVdpZHRoPXsxLjJ9IGNsYXNzTmFtZT1cInRleHQtWyMzNzhBRERdLzUwXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzE0cHhdIGZvbnQtYm9sZCB0ZXh0LXN0b25lLTYwMFwiPkhlbsO8eiB0ZWtuaWsgcmVzaW0geW9rPC9wPlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIHRleHQtc3RvbmUtNDAwIG10LTFcIj5QTkcsIEpQRyB2ZXlhIEpQRUcgZm9ybWF0xLFuZGEgw6dpemltbGVyaW5pemkgecO8a2xleWluPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17b25VcGxvYWR9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtNSBweS0yLjUgYmctWyMzNzhBRERdIHRleHQtd2hpdGUgdGV4dC1bMTJweF0gZm9udC1ib2xkIHJvdW5kZWQteGwgaG92ZXI6YmctWyMyYTZhYjhdIHRyYW5zaXRpb24tY29sb3JzXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8VXBsb2FkIHNpemU9ezE0fSAvPiDEsGxrIHJlc21pIHnDvGtsZVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG4iXSwiZmlsZSI6IkM6L1VzZXJzL2ZhdGloLnRla2luLy5nZW1pbmkvYW50aWdyYXZpdHkvc2NyYXRjaC9wcm9qZTAwMS9zcmMvY29tcG9uZW50cy9zZXR0aW5ncy9hcmNoaXZlL1Rla25pa1Jlc2ltVmlld2VyLmpzeCJ9
