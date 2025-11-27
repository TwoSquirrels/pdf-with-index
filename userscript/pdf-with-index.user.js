// ==UserScript==
// @name         CodiMD PDF with Index Generator
// @namespace    https://github.com/TwoSquirrels/pdf-with-index
// @version      1.0.0
// @description  Generate PDF with automatic indexing from CodiMD (md.trap.jp) notes
// @author       TwoSquirrels
// @match        https://md.trap.jp/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Configuration
  const API_ENDPOINT =
    localStorage.getItem("pdfWithIndex_apiEndpoint") ||
    "http://localhost:8000/generate-pdf";

  // Wait for page to load
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
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

  // Get markdown content from CodeMirror editor
  function getMarkdownContent() {
    // Try to get content from CodeMirror instance
    const cmElement = document.querySelector(".CodeMirror");
    if (cmElement && cmElement.CodeMirror) {
      return cmElement.CodeMirror.getValue();
    }

    // Fallback: Try to get from textarea
    const textarea = document.querySelector("#editor textarea");
    if (textarea) {
      return textarea.value;
    }

    // Fallback: Try to get from .markdown-body
    const markdownBody = document.querySelector(".markdown-body");
    if (markdownBody) {
      return markdownBody.innerText;
    }

    return null;
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
    }, 3000);
  }

  // Generate PDF
  async function generatePDF(button) {
    const originalText = button.textContent;
    button.textContent = "生成中...";
    button.disabled = true;

    try {
      const content = getMarkdownContent();
      if (!content) {
        throw new Error("Markdownコンテンツを取得できませんでした");
      }

      const title = getDocumentTitle();

      // Make API request
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Server error: ${response.status}`
        );
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification("PDFを生成しました", "success");
    } catch (error) {
      console.error("PDF generation failed:", error);
      showNotification(`エラー: ${error.message}`, "error");
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  // Create PDF button
  function createPDFButton() {
    const button = document.createElement("button");
    button.textContent = "📄 索引付きPDF";
    button.className = "pdf-generate-btn";

    Object.assign(button.style, {
      padding: "6px 12px",
      marginLeft: "8px",
      backgroundColor: "#4a90d9",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "background-color 0.2s ease",
    });

    button.addEventListener("mouseenter", () => {
      if (!button.disabled) {
        button.style.backgroundColor = "#357abd";
      }
    });

    button.addEventListener("mouseleave", () => {
      if (!button.disabled) {
        button.style.backgroundColor = "#4a90d9";
      }
    });

    button.addEventListener("click", () => generatePDF(button));

    return button;
  }

  // Add settings option
  function createSettingsButton() {
    const button = document.createElement("button");
    button.textContent = "⚙️";
    button.title = "PDF生成設定";
    button.className = "pdf-settings-btn";

    Object.assign(button.style, {
      padding: "6px 8px",
      marginLeft: "4px",
      backgroundColor: "transparent",
      color: "#666",
      border: "1px solid #ddd",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px",
    });

    button.addEventListener("click", () => {
      const currentEndpoint =
        localStorage.getItem("pdfWithIndex_apiEndpoint") ||
        "http://localhost:8000/generate-pdf";
      const newEndpoint = prompt("APIエンドポイントURL:", currentEndpoint);

      if (newEndpoint !== null) {
        localStorage.setItem("pdfWithIndex_apiEndpoint", newEndpoint);
        showNotification("設定を保存しました", "success");
        // Reload to apply new endpoint
        location.reload();
      }
    });

    return button;
  }

  // Initialize
  async function init() {
    try {
      // Wait for toolbar/header to be available
      const toolbar = await waitForElement(
        ".toolbar, .header-toolbar, nav.navbar, .ui-edit-area-container, header"
      );

      // Create container for buttons
      const container = document.createElement("div");
      container.className = "pdf-buttons-container";
      Object.assign(container.style, {
        display: "inline-flex",
        alignItems: "center",
        marginLeft: "auto",
        paddingRight: "8px",
      });

      container.appendChild(createPDFButton());
      container.appendChild(createSettingsButton());

      // Try to insert in appropriate location
      if (toolbar.classList.contains("navbar")) {
        const navbarRight = toolbar.querySelector(
          ".navbar-right, .nav-right, .d-flex"
        );
        if (navbarRight) {
          navbarRight.insertBefore(container, navbarRight.firstChild);
        } else {
          toolbar.appendChild(container);
        }
      } else {
        toolbar.appendChild(container);
      }

      console.log("PDF with Index: Button added successfully");
    } catch (error) {
      console.error("PDF with Index: Failed to initialize", error);
      // Retry after a delay
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
