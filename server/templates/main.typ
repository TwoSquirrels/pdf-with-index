// main.typ - Typst template for PDF with auto-indexing

// Font settings for Japanese support
#let horizontalrule = line(start: (25%, 0%), end: (75%, 0%))
#set text(font: ("Noto Sans CJK JP"), lang: "ja")
#set page(paper: "a4", margin: 2cm)
#set par(justify: true)
#set heading(numbering: "1.1")

// Make index function
// Collects all term metadata and generates a sorted index
#let make-index() = context {
  // Get all index metadata entries and filter for type "index"
  let all-terms = query(metadata)
  let index-terms = all-terms.filter(entry => {
    if type(entry.value) == dictionary {
      entry.value.at("type", default: none) == "index"
    } else {
      false
    }
  })
  
  // Group terms by word with their page numbers
  let term-pages = (:)
  for term in index-terms {
    let word = term.value.word
    let yomi = term.value.yomi
    let page = term.location().page()
    
    if word not in term-pages {
      term-pages.insert(word, (yomi: yomi, pages: (page,)))
    } else {
      let existing = term-pages.at(word)
      if page not in existing.pages {
        term-pages.at(word).pages.push(page)
      }
    }
  }
  
  // Convert to list and sort by yomi (katakana order)
  let sorted-terms = term-pages.pairs().sorted(key: pair => pair.at(1).yomi)
  
  // Group by first character of yomi for section headers
  let current-initial = none
  
  // Render index
  heading(level: 1, outlined: false)[索引]
  
  if sorted-terms.len() == 0 {
    text(fill: gray)[索引項目がありません。]
    return
  }
  
  // Create columns layout
  columns(2, gutter: 1em)[
    #for (word, info) in sorted-terms {
      // Get first character for grouping
      let first-char = info.yomi.clusters().at(0, default: "")
      
      // Check if we need a new section header
      // Group by kana row (あ行, か行, etc.)
      let row = if first-char.match(regex("[アイウエオァィゥェォ]")) != none { "ア" }
        else if first-char.match(regex("[カキクケコガギグゲゴ]")) != none { "カ" }
        else if first-char.match(regex("[サシスセソザジズゼゾ]")) != none { "サ" }
        else if first-char.match(regex("[タチツテトダヂヅデド]")) != none { "タ" }
        else if first-char.match(regex("[ナニヌネノ]")) != none { "ナ" }
        else if first-char.match(regex("[ハヒフヘホバビブベボパピプペポ]")) != none { "ハ" }
        else if first-char.match(regex("[マミムメモ]")) != none { "マ" }
        else if first-char.match(regex("[ヤユヨャュョ]")) != none { "ヤ" }
        else if first-char.match(regex("[ラリルレロ]")) != none { "ラ" }
        else if first-char.match(regex("[ワヲン]")) != none { "ワ" }
        else { "他" }
      
      if row != current-initial {
        current-initial = row
        v(0.5em)
        text(weight: "bold", size: 1.1em)[【#row】]
        v(0.3em)
      }
      
      // Format page numbers
      let pages-str = info.pages.map(p => str(p)).join(", ")
      
      // Entry line with leader dots
      block(spacing: 0.3em)[
        #word #box(width: 1fr, repeat[.]) #pages-str
      ]
    }
  ]
}

// Include body content (will be set by the generator)
#let body-content = include "body.typ"

// Document title (will be set dynamically)
#let doc-title = "Document"

// Title page
#align(center + horizon)[
  #text(size: 2em, weight: "bold")[#doc-title]
]

#pagebreak()

// Table of contents
#outline(title: "目次", indent: auto)

#pagebreak()

// Main content
#body-content

#pagebreak()

// Generate index
#make-index()
