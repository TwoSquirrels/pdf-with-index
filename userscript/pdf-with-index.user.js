// ==UserScript==
// @name         CodiMD PDF with Index Generator
// @namespace    https://github.com/TwoSquirrels/pdf-with-index
// @version      1.0.0
// @description  Generate PDF with automatic indexing from CodiMD (md.trap.jp) notes
// @author       TwoSquirrels
// @match        https://md.trap.jp/*
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function () {
  "use strict";

  // Configuration
  const API_ENDPOINT = "https://pdf-with-index.trap.show/generate-pdf";
  const NOTIFICATION_DURATION = 3000;
  const DEBUG_PREFIX = "[PDF with Index]";
  const MENU_SELECTOR =
    'ul.dropdown-menu.list[role="menu"][aria-labelledby="menu"]';
  const INFO_BLOCK_PATTERN = /\n\s*:::\s*info\s*\n.*?\n\s*:::\s*\n/gs;

  // Wait for page to load
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      console.log(DEBUG_PREFIX, "waitForElement start", selector);
      const startTime = Date.now();

      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          console.log(DEBUG_PREFIX, "waitForElement resolved", selector);
          resolve(element);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for element: ${selector}`));
          return;
        }

        requestAnimationFrame(checkElement);
      };

      checkElement();
    });
  }

  // Get document title
  function getDocumentTitle() {
    // Try to get from page title
    const titleElement = document.querySelector(
      '.title input, h1.title, [data-title], meta[property="og:title"]'
    );
    if (titleElement) {
      if (titleElement.tagName === "INPUT") {
        return titleElement.value || "Untitled";
      }
      if (titleElement.tagName === "META") {
        return titleElement.content || "Untitled";
      }
      return titleElement.textContent || "Untitled";
    }

    // Fallback: Get from document title
    const pageTitle = document.title.replace(" - CodiMD", "").trim();
    return pageTitle || "Untitled";
  }

  // Create and show notification
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = "pdf-notification";
    notification.textContent = message;

    const colors = {
      info: "#3498db",
      success: "#2ecc71",
      error: "#e74c3c",
      warning: "#f39c12",
    };

    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "12px 24px",
      backgroundColor: colors[type] || colors.info,
      color: "white",
      borderRadius: "4px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: "10000",
      fontFamily: "sans-serif",
      fontSize: "14px",
      transition: "opacity 0.3s ease",
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 300);
    }, NOTIFICATION_DURATION);
  }

  // Generate PDF
  async function generatePDF() {
    try {
      const content = unsafeWindow.editor?.getValue?.();
      if (!content) {
        throw new Error("Markdownコンテンツを取得できませんでした");
      }

      const title = getDocumentTitle();
      const sanitizedContent = content
        .replace(INFO_BLOCK_PATTERN, "\n\n")
        .replace(/:\@[0-9A-Za-z_-]+:/g, "");

      // Make API request
      console.log(DEBUG_PREFIX, "generatePDF request", API_ENDPOINT);
      const response = await GM.xmlHttpRequest({
        method: "POST",
        url: API_ENDPOINT,
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ title, content: sanitizedContent }),
        responseType: "blob",
      });

      console.log(DEBUG_PREFIX, "response status", response.status);
      if (response.status < 200 || response.status >= 300) {
        let message = response.statusText || "";
        if (response.response) {
          let text = "";
          if (typeof response.response === "string") {
            text = response.response;
          } else if (typeof response.response.text === "function") {
            text = await response.response.text().catch(() => "");
          }
          if (text) {
            try {
              const parsed = JSON.parse(text);
              message = parsed.detail || parsed.message || text;
            } catch {
              message = text;
            }
          }
        }
        throw new Error(message || `Server error: ${response.status}`);
      }

      const blob = response.response;

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(DEBUG_PREFIX, "PDF blob received");
      showNotification("PDFを生成しました", "success");
    } catch (error) {
      console.error("PDF generation failed:", error);
      showNotification(`エラー: ${error.message}`, "error");
    }
  }

  function createPdfMenuItem(menu) {
    if (menu.querySelector(".ui-download-pdf-with-index")) {
      console.log(DEBUG_PREFIX, "menu already has item");
      return;
    }

    const li = document.createElement("li");
    li.setAttribute("role", "presentation");

    const link = document.createElement("a");
    link.setAttribute("role", "menuitem");
    link.className = "ui-download-pdf-with-index";
    link.tabIndex = -1;
    link.href = "#";
    link.target = "_self";
    link.innerHTML = '<i class="fa fa-file-pdf-o fa-fw"></i> PDF with Index';
    link.addEventListener("click", (event) => {
      event.preventDefault();
      generatePDF();
    });

    li.appendChild(link);
    menu.appendChild(li);
    console.log(DEBUG_PREFIX, "menu item added");
  }

  function ensureMenuItems() {
    document.querySelectorAll(MENU_SELECTOR).forEach((menu) => {
      createPdfMenuItem(menu);
    });
  }

  // Initialize
  function observeMenus() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }
          if (node.matches(MENU_SELECTOR)) {
            console.log(DEBUG_PREFIX, "observer found menu node");
            createPdfMenuItem(node);
            continue;
          }
          const nested = node.querySelector?.(MENU_SELECTOR);
          if (nested) {
            console.log(DEBUG_PREFIX, "observer found nested menu");
            createPdfMenuItem(nested);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    try {
      await waitForElement(MENU_SELECTOR);
      ensureMenuItems();
      observeMenus();
      console.log("PDF with Index: メニュー項目を追加しました");
    } catch (error) {
      console.error("PDF with Index: Failed to initialize", error);
      setTimeout(init, 2000);
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
