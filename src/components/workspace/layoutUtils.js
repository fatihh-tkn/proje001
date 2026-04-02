export const SNAP_LAYOUTS = [
    {
        id: 'split-2',
        name: 'İki Eşit',
        parentClass: 'grid-cols-2 grid-rows-1',
        zones: [
            { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 1, class: 'col-span-1 row-span-1 w-full h-full' }
        ]
    },
    {
        id: 'h-split-2',
        name: 'Üst/Alt Eşit',
        parentClass: 'grid-cols-1 grid-rows-2',
        zones: [
            { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 1, class: 'col-span-1 row-span-1 w-full h-full' }
        ]
    },
    {
        id: 'split-2fr-1fr',
        name: 'Sol Geniş',
        parentClass: 'grid-cols-[2fr_1fr] grid-rows-1',
        zones: [
            { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 1, class: 'col-span-1 row-span-1 w-full h-full' }
        ]
    },
    {
        id: 'split-1fr-2fr',
        name: 'Sağ Geniş',
        parentClass: 'grid-cols-[1fr_2fr] grid-rows-1',
        zones: [
            { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 1, class: 'col-span-1 row-span-1 w-full h-full' }
        ]
    },
    {
        id: 'quad',
        name: 'Dörtlü',
        parentClass: 'grid-cols-2 grid-rows-2',
        zones: [
            { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 1, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 2, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 3, class: 'col-span-1 row-span-1 w-full h-full' }
        ]
    },
    {
        id: 'top-span',
        name: 'Üst Geniş',
        parentClass: 'grid-cols-2 grid-rows-2',
        previewClass: 'grid-cols-2 grid-rows-2',
        zones: [
            { id: 0, class: 'col-span-2 row-span-1 w-full h-full' },
            { id: 1, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 2, class: 'col-span-1 row-span-1 w-full h-full' }
        ]
    },
    {
        id: 'bottom-span',
        name: 'Alt Geniş',
        parentClass: 'grid-cols-2 grid-rows-2',
        previewClass: 'grid-cols-2 grid-rows-2',
        zones: [
            { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 1, class: 'col-span-1 row-span-1 w-full h-full' },
            { id: 2, class: 'col-span-2 row-span-1 w-full h-full' }
        ]
    }
];

export const getGridLayout = (count) => {
    if (count === 0) return "grid-cols-1 grid-rows-1";
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    if (count === 3 || count === 4) return "grid-cols-2 grid-rows-2";
    if (count === 5 || count === 6) return "grid-cols-3 grid-rows-2";
    if (count >= 7 && count <= 9) return "grid-cols-3 grid-rows-3";
    return "grid-cols-4 grid-rows-3";
};
