// Shared button styling.
//
// The app previously used six unrelated button colors (blue, green, purple,
// indigo, orange, gray) at identical weight, so nothing signalled which
// action was the primary one on a screen. These three roles replace that:
// exactly one primary per view, everything else secondary, and danger only
// for consequential actions.
//
// Size/width classes (px-*, py-*, w-full, flex-1) stay at the call site.
const base = 'rounded-lg font-medium transition-colors disabled:cursor-not-allowed';

export const btnPrimary = `${base} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500`;

export const btnSecondary = `${base} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400`;

export const btnDanger = `${base} bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500`;

// Header/toolbar actions that shouldn't compete with page content.
export const btnGhost = `${base} text-gray-700 hover:bg-gray-100`;
