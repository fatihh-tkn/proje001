/**
 * src/locales/index.js — locale entry. Şu an sadece tr.
 */
import tr from './tr.js';

const LOCALES = { tr };
let _active = 'tr';

export const setLocale = (code) => { if (LOCALES[code]) _active = code; };
export const getLocale = () => _active;
export const t = () => LOCALES[_active] || LOCALES.tr;

export const KIND_PHRASES         = tr.KIND_PHRASES;
export const TOAST_DURATIONS      = tr.TOAST_DURATIONS;
export const formatMutationMessage = tr.formatMutationMessage;
export const formatLoadingMessage  = tr.formatLoadingMessage;
export const COMMON               = tr.COMMON;
