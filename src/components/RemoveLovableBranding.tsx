import { useEffect } from "react";

const LOVABLE_PHRASES = [
  "Backed by Lovable Cloud",
  "backed by Lovable Cloud",
];

export default function RemoveLovableBranding() {
  useEffect(() => {
    const removeInjectedBranding = () => {
      const elements = Array.from(document.body.querySelectorAll("*")).filter(
        (element) => element.children.length === 0,
      );

      for (const element of elements) {
        const text = element.textContent?.trim() ?? "";
        if (LOVABLE_PHRASES.includes(text)) {
          element.remove();
          continue;
        }

        if (text.includes("Lovable Cloud")) {
          let next = text;
          for (const phrase of LOVABLE_PHRASES) {
            next = next.replace(phrase, "");
          }
          element.textContent = next.replace(/\s+—\s*$/, "").trim();
        }
      }
    };

    removeInjectedBranding();
    const observer = new MutationObserver(removeInjectedBranding);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
