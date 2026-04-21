import React from "react";

// Basit class birleştirici (Tam cn altyapısı yerine tailwind ile uyumlu basit helper)
export function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}

const DefaultPlaceholder = () => {
    return (
        <div className="space-y-1.5">
            <div className="flex gap-2">
                <div className="bg-stone-300 h-0.5 w-1/2 rounded-full" />
            </div>
            <div className="flex gap-1">
                <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
                <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
            </div>
            <div className="flex gap-1">
                <div className="bg-stone-200 h-0.5 w-1/2 rounded-full" />
                <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
            </div>
            <div className="flex gap-1">
                <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
                <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
            </div>
            <div className="flex gap-1">
                <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
                <div className="bg-stone-200 h-0.5 w-1/2 rounded-full" />
            </div>
            <div className="flex gap-1">
                <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
            </div>
        </div>
    );
};

const colorBannerMap = {
    doc: "bg-[#378ADD] text-white",
    docx: "bg-[#378ADD] text-white",
    pdf: "bg-[#ba3b3b] text-white",
    md: "bg-stone-600 text-white",
    mdx: "bg-stone-600 text-white",
    txt: "bg-stone-500 text-white",
    csv: "bg-[#488e7a] text-white",
    xls: "bg-[#1D9E75] text-white",
    xlsx: "bg-[#1D9E75] text-white",
    ppt: "bg-[#D85A30] text-white",
    pptx: "bg-[#D85A30] text-white",
    zip: "bg-indigo-500 text-white",
    rar: "bg-indigo-600 text-white",
    tar: "bg-yellow-600 text-white",
    gz: "bg-yellow-700 text-white",
    html: "bg-orange-600 text-white",
    js: "bg-yellow-600 text-white",
    jsx: "bg-[#378ADD] text-white",
    css: "bg-sky-500 text-white",
    json: "bg-amber-500 text-white",
    tsx: "bg-[#378ADD] text-white",
    code: "bg-orange-600 text-white",
    img: "bg-pink-500 text-white",
    png: "bg-violet-600 text-white",
    jpg: "bg-violet-600 text-white",
    jpeg: "bg-violet-600 text-white",
    video: "bg-pink-600 text-white",
    mp3: "bg-amber-600 text-white",
    wav: "bg-amber-600 text-white",
    ogg: "bg-amber-600 text-white",
    mp4: "bg-pink-600 text-white",
    mov: "bg-pink-600 text-white",
};

export const FileCard = ({ formatFile }) => {
    const normalizedFormat = (formatFile || "txt").toLowerCase();

    // Bulunamazsa txt/default rengini ver
    const colorBannerClass = colorBannerMap[normalizedFormat] || "bg-stone-400 text-white";
    let filePlaceholder = <DefaultPlaceholder />;

    // Desteklenen özel skeleton görünümleri için haritalama
    const typeForSkeleton =
        ['mp4', 'avi', 'mov', 'webm', 'video'].includes(normalizedFormat) ? 'video' :
            ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'img'].includes(normalizedFormat) ? 'img' :
                normalizedFormat;

    if (typeForSkeleton === "md" || typeForSkeleton === "mdx") {
        filePlaceholder = (
            <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                    <div className="text-stone-400 text-[10px] font-bold">#</div>
                    <div className="bg-stone-300 h-0.5 w-6 rounded-full" />
                </div>
                <div className="space-y-1">
                    <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
                    <div className="bg-stone-200 h-0.5 w-7 rounded-full" />
                </div>
                <div className="space-y-1">
                    <div className="bg-stone-200 h-0.5 w-8 rounded-full" />
                    <div className="bg-stone-200 h-0.5 w-4 rounded-full" />
                    <div className="bg-stone-200 h-0.5 w-1/3 rounded-full" />
                </div>
            </div>
        );
    }

    if (typeForSkeleton === "xls" || typeForSkeleton === "xlsx") {
        filePlaceholder = (
            <div className="space-y-0.5">
                <div className="grid grid-cols-3 gap-0.5">
                    <div className="bg-stone-300 h-2" />
                    <div className="bg-stone-300 h-2" />
                    <div className="bg-stone-300 h-2" />
                </div>
                <div className="grid grid-cols-3 gap-0.5">
                    <div className="bg-stone-100 h-2" />
                    <div className="bg-stone-100 h-2" />
                    <div className="bg-stone-100 h-2" />
                    <div className="bg-stone-100 h-2" />
                    <div className="bg-stone-100 h-2" />
                    <div className="bg-stone-100 h-2" />
                </div>
                <div className="grid grid-cols-3 gap-0.5">
                    <div className="bg-stone-100 h-2" />
                    <div className="bg-stone-100 h-2" />
                </div>
                <div className="grid grid-cols-3 gap-0.5">
                    <div className="bg-stone-100 h-2" />
                </div>
            </div>
        );
    }

    if (typeForSkeleton === "csv") {
        filePlaceholder = (
            <>
                <div className="mb-2">
                    <div className="grid grid-cols-3 gap-0.5">
                        <div className="bg-stone-300 h-1.5 rounded-full" />
                        <div className="bg-stone-300 h-1.5 rounded-full" />
                        <div className="bg-stone-300 h-1.5 rounded-full" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-0.5">
                        <div className="bg-stone-100 h-1 rounded-full" />
                        <div className="bg-stone-100 h-1 rounded-full" />
                        <div className="bg-stone-100 h-1 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                        <div className="bg-stone-100 h-1 rounded-full" />
                        <div className="bg-stone-100 h-1 rounded-full" />
                        <div className="bg-stone-100 h-1 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-0.5">
                        <div className="bg-stone-100 h-1 rounded-full" />
                        <div className="bg-stone-100 h-1 rounded-full" />
                    </div>
                </div>
            </>
        );
    }

    if (["zip", "rar", "tar", "gz"].includes(typeForSkeleton)) {
        filePlaceholder = (
            <div className="relative flex h-full flex-col items-center justify-center">
                <div className="space-y-0">
                    <div className="flex overflow-hidden rounded-full">
                        <div className="bg-stone-300 size-1.5" />
                        <div className="bg-stone-100 size-1.5" />
                    </div>
                    <div className="flex overflow-hidden rounded-full">
                        <div className="bg-stone-100 size-1.5" />
                        <div className="bg-stone-300 size-1.5" />
                    </div>
                    <div className="flex overflow-hidden rounded-full">
                        <div className="bg-stone-300 size-1.5" />
                        <div className="bg-stone-100 size-1.5" />
                    </div>
                    <div className="flex overflow-hidden rounded-full">
                        <div className="bg-stone-100 size-1.5" />
                        <div className="bg-stone-300 size-1.5" />
                    </div>
                    <div className="flex overflow-hidden rounded-full">
                        <div className="bg-stone-300 size-1.5" />
                        <div className="bg-stone-100 size-1.5" />
                    </div>
                </div>
            </div>
        );
    }

    if (typeForSkeleton === "ppt" || typeForSkeleton === "pptx") {
        filePlaceholder = (
            <>
                <div className="bg-stone-100 mb-1.5 space-y-1 rounded border border-stone-200 p-1">
                    <div className="flex justify-center gap-1">
                        <div className="size-3 rounded-sm bg-orange-400/40" />
                    </div>
                    <div className="bg-stone-200 mx-auto h-[3px] w-8 rounded-full" />
                </div>
                <div className="mb-1 flex justify-center gap-1">
                    <div className="bg-stone-200 h-[3px] w-8 rounded-full" />
                    <div className="bg-stone-200 h-[3px] w-4 rounded-full" />
                </div>
                <div className="space-y-1">
                    <div className="bg-stone-200 h-[3px] w-4 rounded-full" />
                    <div className="bg-stone-200 h-[3px] w-5 rounded-full" />
                </div>
            </>
        );
    }

    if (typeForSkeleton === "img") {
        filePlaceholder = (
            <>
                <div className="bg-stone-100 mb-1.5 space-y-1 rounded border border-stone-200 p-1">
                    <div className="flex justify-center gap-1">
                        <div className="size-3 rounded-sm bg-violet-400/40" />
                    </div>
                    <div className="bg-stone-200 mx-auto mt-1 h-[3px] w-4 rounded-full" />
                    <div className="bg-stone-200 mx-auto h-[3px] w-8 rounded-full" />
                </div>
            </>
        );
    }

    if (typeForSkeleton === "video") {
        filePlaceholder = (
            <>
                <div className="bg-stone-100 mb-1.5 space-y-1 rounded border border-stone-200 p-1">
                    <div className="flex justify-center gap-1">
                        <div className="w-0 h-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-pink-400/80" />
                    </div>
                    <div className="bg-stone-200 mx-auto mt-1 h-[3px] w-4 rounded-full" />
                    <div className="bg-stone-200 mx-auto h-[3px] w-8 rounded-full" />
                </div>
            </>
        );
    }

    if (["mp3", "wav", "ogg"].includes(typeForSkeleton)) {
        filePlaceholder = (
            <>
                <div className="bg-stone-100 mb-1.5 space-y-[2px] rounded border border-stone-200 p-1.5 flex items-end justify-center gap-[2px] h-10">
                    <div className="w-1 bg-amber-400/60 rounded-t-sm h-3" />
                    <div className="w-1 bg-amber-400/60 rounded-t-sm h-6" />
                    <div className="w-1 bg-amber-400/60 rounded-t-sm h-4" />
                    <div className="w-1 bg-amber-400/60 rounded-t-sm h-5" />
                    <div className="w-1 bg-amber-400/60 rounded-t-sm h-2" />
                </div>
            </>
        );
    }

    if (["html", "js", "jsx", "tsx", "code"].includes(typeForSkeleton)) {
        filePlaceholder = (
            <div className="space-y-1">
                <div className="flex items-center gap-0.5">
                    <div className="text-stone-400 font-mono text-[5px]">&lt;</div>
                    <div className="h-[3px] w-3 rounded-full bg-emerald-400/60" />
                    <div className="text-stone-400 font-mono text-[5px]">&gt;</div>
                </div>
                <div className="flex items-center gap-0.5 pl-1">
                    <div className="text-stone-400 font-mono text-[5px]">&lt;</div>
                    <div className="h-[3px] w-2.5 rounded-full bg-sky-400/60" />
                    <div className="text-stone-400 font-mono text-[5px]">&gt;</div>
                </div>
                <div className="flex items-center gap-0.5 pl-1">
                    <div className="text-stone-400 font-mono text-[5px]">&lt;/</div>
                    <div className="h-[3px] w-2.5 rounded-full bg-sky-400/60" />
                    <div className="text-stone-400 font-mono text-[5px]">&gt;</div>
                </div>
                <div className="flex items-center gap-0.5">
                    <div className="text-stone-400 font-mono text-[5px]">&lt;</div>
                    <div className="h-[3px] w-1 rounded-full bg-emerald-400/60" />
                    <div className="text-stone-400 font-mono text-[5px]">/&gt;</div>
                </div>
            </div>
        );
    }

    if (typeForSkeleton === "css") {
        filePlaceholder = (
            <div className="space-y-1">
                <div className="flex items-center gap-1">
                    <div className="text-stone-500 font-mono text-[6px]">{"{"}</div>
                </div>
                <div className="flex items-center gap-1 pl-1.5">
                    <div className="h-[3px] w-3 rounded-full bg-sky-400/60" />
                    <div className="h-[3px] w-4 rounded-full bg-sky-400/60" />
                </div>
                <div className="flex items-center gap-1 pl-1.5">
                    <div className="h-[3px] w-4 rounded-full bg-sky-400/60" />
                    <div className="h-[3px] w-2 rounded-full bg-sky-400/60" />
                </div>
                <div className="flex items-center gap-1 pl-1.5">
                    <div className="h-[3px] w-3 rounded-full bg-sky-400/60" />
                    <div className="h-[3px] w-4 rounded-full bg-sky-400/60" />
                </div>
                <div className="flex items-center gap-1">
                    <div className="text-stone-500 font-mono text-[6px]">{"}"}</div>
                </div>
            </div>
        );
    }

    if (typeForSkeleton === "json") {
        filePlaceholder = (
            <div className="space-y-1">
                <div className="flex items-center gap-1">
                    <div className="text-stone-500 font-mono text-[6px]">{"{"}</div>
                </div>
                <div className="flex items-center gap-1 pl-1.5">
                    <div className="bg-stone-300 h-[3px] w-3 rounded-full" />
                    <div className="bg-stone-300 h-[3px] w-4 rounded-full" />
                </div>
                <div className="flex items-center gap-1 pl-1.5">
                    <div className="bg-stone-200 h-[3px] w-4 rounded-full" />
                    <div className="bg-stone-200 h-[3px] w-2 rounded-full" />
                </div>
                <div className="flex items-center gap-1 pl-1.5">
                    <div className="bg-stone-200 h-[3px] w-3 rounded-full" />
                    <div className="bg-stone-200 h-[3px] w-4 rounded-full" />
                </div>
                <div className="flex items-center gap-1 pl-1.5">
                    <div className="bg-stone-200 h-[3px] w-3 rounded-full" />
                </div>
                <div className="flex items-center gap-1">
                    <div className="text-stone-500 font-mono text-[6px]">{"}"}</div>
                </div>
            </div>
        );
    }

    const sizeClass = "w-11 h-14";

    return (
        <div aria-hidden className="relative shrink-0 flex items-center justify-center">
            <div
                className={cn(
                    "absolute -right-2 bottom-0 z-10 rounded px-1 py-[2px] text-[8px] font-bold tracking-wider uppercase border border-white/20 shadow-sm",
                    colorBannerClass
                )}
            >
                {normalizedFormat.slice(0, 4)} {/* Çok uzun uzantılar (örn webm) sığsın diye */}
            </div>
            <div
                className={cn(
                    "relative z-1 flex flex-col justify-center rounded-md bg-white p-1.5 ring-1 ring-stone-200 shadow-sm overflow-hidden",
                    sizeClass
                )}
            >
                {/* Dekoratif üst katlama efekti */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-stone-100 border-b border-l border-stone-200 rounded-bl-sm z-10" />

                {filePlaceholder}
            </div>
        </div>
    );
};

export default FileCard;
