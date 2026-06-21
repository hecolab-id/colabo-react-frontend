import DOMPurify from "dompurify";

let linkHookReady = false;

// Sanitize user-authored rich-text HTML (tiptap output) before rendering it
// with dangerouslySetInnerHTML, and force any link to open safely. This is the
// same policy the internal task detail view uses, shared so the public page
// renders descriptions with identical, trusted sanitization.
export function sanitizeRichText(html: string): string {
    if (typeof window === "undefined" || !html) return html;
    if (!linkHookReady) {
        DOMPurify.addHook("afterSanitizeAttributes", (node) => {
            if (node.tagName === "A" && node.getAttribute("href")) {
                node.setAttribute("target", "_blank");
                node.setAttribute("rel", "noopener noreferrer nofollow");
            }
        });
        linkHookReady = true;
    }
    return DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
}
