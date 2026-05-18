import { useEffect } from 'react';

/**
 * Textarea'yı içerik uzunluğuna göre otomatik yeniden boyutlandırır.
 *
 * @param {React.RefObject} textareaRef - Yeniden boyutlandırılacak textarea'nın ref'i
 * @param {string}          inputValue  - Textarea içeriği (değişince tetiklenir)
 * @param {boolean}         isExpanded  - Genişletilmiş mod bayrağı
 * @param {boolean}         isSideOpen  - Panel açık mı (kapalıysa yeniden boyutlandırma atlanır)
 */
export const useTextareaResize = (textareaRef, inputValue, isExpanded, isSideOpen) => {
    useEffect(() => {
        if (!textareaRef.current || !isSideOpen) return;
        const initialHeight = 51.2;
        const maxHeight = initialHeight * 3;
        if (isExpanded) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height =
                scrollHeight > maxHeight ? `${maxHeight}px` : `${scrollHeight}px`;
        } else {
            textareaRef.current.style.height = '3.2rem';
        }
    }, [inputValue, isExpanded, isSideOpen, textareaRef]);
};
