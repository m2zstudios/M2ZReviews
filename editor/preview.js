let savedRange = null;
let colorMode = false;
let lastPickedColor = null;


const styler = document.getElementById("textStyler");
const linkEditor = document.getElementById("linkEditor");
const linkInput = document.getElementById("linkInput");
const linkBlank = document.getElementById("linkBlank");
const linkDone = document.getElementById("linkDone");
const colorPicker = document.getElementById("colorPicker");

let linkMode = false; // 👈 important


function wrapSelection(wrapper) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  try {
    range.surroundContents(wrapper);
    sel.removeAllRanges();
  } catch (e) {
    // fallback if selection is partial (multiple nodes)
    const frag = range.extractContents();
    wrapper.appendChild(frag);
    range.insertNode(wrapper);
  }
}



function renderPreview() {

document.documentElement.style.setProperty('--title-size', pageData.titleSize + 'px');
document.documentElement.style.setProperty('--title-weight', pageData.titleWeight);
document.documentElement.style.setProperty('--title-align', pageData.titleAlign);


  const preview = document.getElementById("preview");
  if (!preview) return;

  const today = new Date().toISOString().split("T")[0];

  preview.innerHTML = `
    <div class="article-wrapper">

      <!-- TITLE BLOCK ALWAYS -->
      <div class="title-block">
        <h1 class="dynamic-title">
          ${pageData.title || "Untitled"}
        </h1>
        <div class="post-date">${today}</div>
      </div>

      ${
        pageData.heroImage
          ? `<div class="hero-wrapper">
               <img src="${pageData.heroImage}" 
                    style="height:${pageData.heroHeight}px">
             </div>`
          : ""
      }

      ${
        pageData.sections.map((sec, i) => {


          if(sec.type === "text"){
            return `
              <div class="text-block"
     contenteditable="true"
     data-index="${i}"
     style="
       font-size:${sec.size}px;
       font-weight:${sec.weight};
       text-align:${sec.align};
     ">${sec.content || ""}</div>

            `;
          }

          if(sec.type === "grid"){
  return `
    <div class="image-grid ipr-${sec.ipr}">
      ${sec.img1 ? `<img src="${sec.img1}">` : ""}
      ${sec.img2 ? `<img src="${sec.img2}">` : ""}
    </div>
  `;
}




          if(sec.type === "button"){
            return `
              <div class="button-wrapper" style="text-align:${sec.align};">
                <a href="${sec.link}" target="_blank">
                  ${sec.text}
                </a>
              </div>
            `;
          }

          return "";

        }).join("")
      }

    </div>
  `;

document.querySelectorAll(".text-block[contenteditable]").forEach(el=>{
  el.oninput = () => {
    const idx = el.dataset.index;
    pageData.sections[idx].content = el.innerHTML;
  };
});

  function exportHTML() {

  const previewNode = document.getElementById("preview").cloneNode(true);

// remove contenteditable
previewNode.querySelectorAll('[contenteditable]').forEach(el => {
  el.removeAttribute('contenteditable');
});

const previewContent = previewNode.innerHTML;


  const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${pageData.title}</title>
<style>
${document.querySelector("style") 
  ? document.querySelector("style").innerHTML 
  : ""}
</style>
<link rel="stylesheet" href="style.css">
</head>
<body>

<div class="preview-wrapper">
${previewContent}
</div>

</body>
</html>
`;

  const blob = new Blob([fullHTML], { type: "text/html" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = (pageData.title || "page") + ".html";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
const styler = document.getElementById("textStyler");

    document.addEventListener("selectionchange", () => {

      // 🔥 finalize color when selection collapses
      if (colorMode && lastPickedColor) {
        colorMode = false;
        styler.style.display = "none";
        return;
      }

      if (linkMode) return;

      const sel = window.getSelection();

      if (!sel || sel.isCollapsed) {
        styler.style.display = "none";
        return;
      }

      savedRange = sel.getRangeAt(0);

      const rect = savedRange.getBoundingClientRect();

      styler.style.display = "flex";
      styler.style.top = (rect.top - 45) + "px";
      styler.style.left = (rect.left + rect.width / 2) + "px";
    });

    document.addEventListener("mousedown", e => {
  if (!colorMode) return;

  if (!e.target.closest("#colorPicker")) {
    colorMode = false;
    styler.style.display = "none";
  }
});


styler.querySelectorAll("button").forEach(btn => {
  btn.onclick = () => {
    const cmd = btn.dataset.cmd;

    if (!savedRange) return;

    if (cmd === "bold") {
  const b = document.createElement("strong");
  wrapSelection(b);
}
    if (cmd === "underline") {
  const u = document.createElement("u");
  wrapSelection(u);
}

    // 🎨 COLOR PICKER
    if (cmd === "color") {
      colorMode = true;
      lastPickedColor = null;
      colorPicker.click();
      }


    // 🔗 LINK
    if (cmd === "link") {
  linkMode = true;

  const rect = savedRange.getBoundingClientRect();

  styler.style.display = "none";
  linkEditor.style.display = "flex";
  linkEditor.style.top = (rect.top - 45) + "px";
  linkEditor.style.left = rect.left + "px";

  linkInput.value = "";
  linkBlank.checked = true;

  setTimeout(() => linkInput.focus(), 10);
  }

  };
});
linkDone.onclick = () => {
  if (!savedRange || !linkInput.value) return;

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);

  const a = document.createElement("a");
  a.href = linkInput.value;
  a.target = linkBlank.checked ? "_blank" : "_self";

  wrapSelection(a);

  linkEditor.style.display = "none";
  linkMode = false;
};



      colorPicker.oninput = () => {
  if (!savedRange) return;

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);

  const span = document.createElement("span");
  span.style.color = colorPicker.value;

  wrapSelection(span);
};





}
