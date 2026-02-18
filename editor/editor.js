let pageData = {
    title:"Untitled",
    metaDescription:"",
    ogImage:"",
    titleSize:32,
    titleWeight:"400",
    titleAlign:"left",
    heroImage:"",
    heroHeight:350,
    sections:[]
};


function bindMainInputs(){

    document.getElementById("titleInput").oninput=e=>{
        pageData.title=e.target.value || "Untitled";
        renderPreview();
    };

    document.getElementById("titleSize").oninput=e=>{
        pageData.titleSize=e.target.value;
        renderPreview();
    };

    document.getElementById("titleWeight").onchange=e=>{
        pageData.titleWeight=e.target.value;
        renderPreview();
    };

    document.getElementById("titleAlign").onchange=e=>{
        pageData.titleAlign=e.target.value;
        renderPreview();
    };

    document.getElementById("heroInput").oninput=e=>{
        pageData.heroImage=e.target.value;
        renderPreview();
    };

    document.getElementById("heroHeight").oninput=e=>{
        pageData.heroHeight=e.target.value;
        renderPreview();
    };

    document.getElementById("metaDescription").oninput = e => {
    pageData.metaDescription = e.target.value;
    };

    document.getElementById("ogImageInput").oninput = e => {
        pageData.ogImage = e.target.value;
    };

}

function addText(){
    pageData.sections.push({
        type:"text",
        content:"",
        size:16,
        weight:"400",
        align:"left"
    });
    renderEditor();
}

function addGrid(){
    pageData.sections.push({
        type:"grid",
        img1:"",
        img2:"",
        ipr:1   // default 1 image per row
    });
    renderEditor();
}


function addButton(){
    pageData.sections.push({
        type:"button",
        text:"Buy Now",
        link:"#",
        align:"left"
    });
    renderEditor();
}

function renderEditor(){
    const container=document.getElementById("sectionsEditor");
    container.innerHTML="";

    pageData.sections.forEach((sec,i)=>{

        let box=document.createElement("div");
        box.className="editor-box";

        // TEXT SECTION
        if(sec.type==="text"){
            box.innerHTML=`
            <h4>Text Section ${i+1}</h4>
            <textarea>${sec.content}</textarea>
            <label>Font Size</label>
            <input type="number" value="${sec.size}">
            <label>Weight</label>
            <select>
              <option value="400" ${sec.weight=="400"?"selected":""}>Normal</option>
              <option value="700" ${sec.weight=="700"?"selected":""}>Bold</option>
            </select>
            <label>Align</label>
            <select>
              <option value="left" ${sec.align=="left"?"selected":""}>Left</option>
              <option value="center" ${sec.align=="center"?"selected":""}>Center</option>
              <option value="right" ${sec.align=="right"?"selected":""}>Right</option>
            </select>
            <button onclick="deleteSection(${i})">Delete</button>
            `;

            let t=box.querySelector("textarea");
            let size=box.querySelectorAll("input")[0];
            let selects=box.querySelectorAll("select");

            t.oninput=e=>{sec.content=e.target.value;renderPreview();};
            size.oninput=e=>{sec.size=e.target.value;renderPreview();};
            selects[0].onchange=e=>{sec.weight=e.target.value;renderPreview();};
            selects[1].onchange=e=>{sec.align=e.target.value;renderPreview();};
        }

        // GRID SECTION
        if(sec.type==="grid"){
    box.innerHTML=`
    <h4>Image Grid</h4>

    <input placeholder="Image 1 URL" value="${sec.img1}">
    <input placeholder="Image 2 URL" value="${sec.img2}">


    <label>Images Per Row (IPR)</label>
    <select>
      <option value="2" ${sec.ipr==2?"selected":""}>2 IPR</option>
      <option value="1" ${sec.ipr==1?"selected":""}>1 IPR</option>
      
    </select>

    <button onclick="deleteSection(${i})">Delete</button>
    `;

    let inputs=box.querySelectorAll("input");
    let sel=box.querySelector("select");

    inputs[0].oninput=e=>{sec.img1=e.target.value;renderPreview();};
    inputs[1].oninput=e=>{sec.img2=e.target.value;renderPreview();};
    sel.onchange=e=>{sec.ipr=parseInt(e.target.value);renderPreview();};
}


        // BUTTON SECTION
        if(sec.type==="button"){
            box.innerHTML=`
            <h4>Button</h4>
            <input value="${sec.text}">
            <input value="${sec.link}">
            <label>Align</label>
            <select>
              <option value="left" ${sec.align=="left"?"selected":""}>Left</option>
              <option value="center" ${sec.align=="center"?"selected":""}>Center</option>
              <option value="right" ${sec.align=="right"?"selected":""}>Right</option>
            </select>
            <button onclick="deleteSection(${i})">Delete</button>
            `;

            let inputs=box.querySelectorAll("input");
            let sel=box.querySelector("select");

            inputs[0].oninput=e=>{sec.text=e.target.value;renderPreview();};
            inputs[1].oninput=e=>{sec.link=e.target.value;renderPreview();};
            sel.onchange=e=>{sec.align=e.target.value;renderPreview();};
        }

        container.appendChild(box);
    });

    renderPreview();
}

function deleteSection(i){
    pageData.sections.splice(i,1);
    renderEditor();
}

bindMainInputs();
renderEditor();

function exportHTML() {

  renderPreview();

  const previewContent = document.getElementById("preview").innerHTML;

  const wordCount = previewContent.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const previewCSS = `
*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:'Segoe UI', Arial, sans-serif;
  background:#eef1f6;
  color:#333;
}

/* HEADER */
.site-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:18px 40px;
  background:#111;
  color:white;
}

.site-header .logo{
  font-weight:600;
  font-size:18px;
}

.site-header nav a{
  color:#ddd;
  margin-left:20px;
  text-decoration:none;
  font-size:14px;
}

.site-header nav a:hover{
  color:white;
}

/* =========================
   LAYOUT (UPDATED 90% WIDTH)
========================= */
.layout{
  display:flex;
  width:90%;
  max-width:1600px;
  margin:40px auto;
  gap:40px;
}

/* MAIN */
.main-content{
  flex:2.2;
}

/* REVIEW CARD */
.preview-wrapper{
  background:#ffffff;
  padding:40px;
  border-radius:20px;
  box-shadow:0 15px 40px rgba(0,0,0,0.08);
}

.reading-time{
  font-size:13px;
  color:#6b7280;
  margin-bottom:15px;
}

.title-block{
  background:#f8fafc;
  padding:25px;
  border-radius:18px;
  margin-bottom:25px;
  border:1px solid #e5e7eb;
}

.title-block h1{
  margin:0;
  line-height:1.3;
  font-size:${pageData.titleSize}px;
  font-weight:${pageData.titleWeight};
  text-align:${pageData.titleAlign};
}

.post-date{
  margin-top:10px;
  font-size:14px;
  color:#6b7280;
}

.hero-wrapper{
  margin-top:20px;
  margin-bottom:30px;
}

.hero-wrapper img{
  width:100%;
  border-radius:16px;
}

.text-block{
  line-height:1.8;
  margin-bottom:30px;
  white-space:pre-wrap;
}

.image-grid{
  display:grid;
  gap:20px;
  margin-top:25px;
  margin-bottom:30px;
}

.image-grid.ipr-1{
  grid-template-columns: repeat(2, 1fr);
}

.image-grid.ipr-2{
  grid-template-columns: 1fr;
}

.image-grid img{
  width:100%;
  height:260px;
  object-fit:cover;
  border-radius:16px;
  cursor:pointer;
}

.button-wrapper{
  margin-top:25px;
  margin-bottom:20px;
}

.button-wrapper a{
  display:inline-block;
  padding:14px 28px;
  background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:white;
  text-decoration:none;
  border-radius:30px;
  font-weight:600;
  transition:0.25s ease;
  box-shadow:0 6px 20px rgba(37,99,235,0.3);
}

.button-wrapper a:hover{
  transform:translateY(-3px);
}

/* =========================
   SIDEBAR (WIDER + STICKY)
========================= */
.sidebar{
  flex:1.2;
  position:sticky;
  top:30px;
  height:fit-content;
  background:white;
  padding:20px;
  border-radius:16px;
  box-shadow:0 10px 25px rgba(0,0,0,0.05);
}

.sidebar h3{
  margin-top:0;
}

.sidebar ul{
  list-style:none;
  padding:0;
}

.sidebar li{
  margin-bottom:12px;
}

.sidebar a{
  text-decoration:none;
  color:#2563eb;
  font-size:14px;
}

.promo-box{
  margin-top:30px;
  padding:15px;
  background:#f8fafc;
  border-radius:12px;
}

/* =========================
   AUTHOR CARD
========================= */
.author-card{
  margin-top:40px;
  padding:20px;
  border-radius:14px;
  background:#f9fafb;
  display:flex;
  align-items:center;
  gap:15px;
}

.author-card img{
  width:60px;
  height:60px;
  border-radius:50%;
  object-fit:cover;
}

.author-info{
  display:flex;
  align-items:center;
  gap:6px;
  font-weight:600;
}

.author-info img{
  width:18px;
  height:18px;
}

.author-bio{
  font-size:13px;
  color:#555;
  margin-top:5px;
}

/* =========================
   LIGHTBOX
========================= */
.lightbox{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.8);
  display:flex;
  justify-content:center;
  align-items:center;
  z-index:9999;
}

.lightbox img{
  max-width:90%;
  max-height:90%;
  border-radius:12px;
}

.lightbox-close{
  position:absolute;
  top:30px;
  right:40px;
  color:white;
  font-size:28px;
  cursor:pointer;
}

/* =========================
   RESPONSIVE
========================= */
@media(max-width:900px){
  .layout{
    flex-direction:column;
  }

  .sidebar{
    position:relative;
    top:auto;
  }

  .image-grid.ipr-1{
    grid-template-columns:1fr;
  }
}
  /* =========================
   DARK MODE
========================= */

body.dark{
  background:#0f172a;
  color:#e5e7eb;
}

body.dark .preview-wrapper,
body.dark .sidebar{
  background:#1e293b;
  box-shadow:0 10px 30px rgba(0,0,0,0.4);
}

body.dark .title-block{
  background:#334155;
  border:1px solid #475569;
}

body.dark .promo-box{
  background:#334155;
}

body.dark .author-card{
  background:#334155;
}

body.dark .site-header{
  background:#000;
}

body.dark .sidebar a{
  color:#60a5fa;
}

body.dark .button-wrapper a{
  background:linear-gradient(135deg,#3b82f6,#2563eb);
}
.text-styler{
  position:fixed;
  display:none;
  gap:6px;
  padding:6px;
  background:#111;
  border-radius:10px;
  box-shadow:0 10px 25px rgba(0,0,0,0.3);
  z-index:99999;
}

.text-styler button{
  background:#fff;
  border:none;
  padding:6px 8px;
  border-radius:6px;
  cursor:pointer;
  font-size:13px;
}

.text-styler button:hover{
  background:#e5e7eb;
}

`;


  const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${pageData.title}</title>

<meta name="description" content="${pageData.metaDescription}">
<meta property="og:title" content="${pageData.title}">
<meta property="og:description" content="${pageData.metaDescription}">
<meta property="og:image" content="${pageData.ogImage}">
<meta property="og:type" content="website">

<style>${previewCSS}</style>
</head>
<body>

<header class="site-header">
  <div class="logo">TechReviews</div>
  <nav>
  <a href="#">Home</a>
  <a href="#">Reviews</a>
  <a href="#">Compare</a>
  <a href="#">About</a>
  <button id="themeToggle" style="
    margin-left:20px;
    padding:6px 12px;
    border-radius:20px;
    border:none;
    cursor:pointer;
    font-size:13px;
  ">🌙</button>
</nav>

</header>

<div class="layout">

  <main class="main-content">
    <div class="preview-wrapper">

      <div class="reading-time">${readingTime} min read</div>
      ${previewContent}
    </div>
  </main>

  <aside class="sidebar">
    <h3>Related Reviews</h3>
    <ul>
      <li><a href="#">iQOO Neo 9 Review</a></li>
      <li><a href="#">Realme GT 6 Overview</a></li>
      <li><a href="#">Nothing Phone 3 Rumors</a></li>
    </ul>

    <div class="promo-box">
      <h4>Trending Now</h4>
      <p>Best phones under ₹20,000 in 2026</p>
    </div>

    <div class="author-card">
      <img src="https://sfo.cloud.appwrite.io/v1/storage/buckets/695f9d8b0029dbe41ecb/files/698713ef00364283675d/view?project=695f94f9003a97931795">
      <div>
        <div class="author-info">
          Meraz Ahmed
          <img src="https://png.pngtree.com/png-clipart/20230422/original/pngtree-instagram-bule-tick-insta-blue-star-vector-png-image_9074860.png">
        </div>
        <div class="author-bio">
          Tech reviewer & gadget analyst. Sharing honest reviews and comparisons.
        </div>
      </div>
    </div>

  </aside>

</div>
<script>
(function(){

  const toggleBtn = document.getElementById("themeToggle");

  function applyTheme(theme){
    if(theme === "dark"){
      document.body.classList.add("dark");
      toggleBtn.textContent = "☀️";
    }else{
      document.body.classList.remove("dark");
      toggleBtn.textContent = "🌙";
    }
  }

  // Load saved theme
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  // Toggle click
  toggleBtn.addEventListener("click", function(){
    const currentTheme = document.body.classList.contains("dark") ? "dark" : "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  });

})();
</script>

<script>
document.querySelectorAll(".image-grid img, .hero-wrapper img").forEach(function(img){
  img.addEventListener("click", function(){
    var lightbox = document.createElement("div");
    lightbox.className = "lightbox";

    var image = document.createElement("img");
    image.src = img.src;

    var close = document.createElement("span");
    close.className = "lightbox-close";
    close.innerHTML = "&times;";

    lightbox.appendChild(close);
    lightbox.appendChild(image);

    lightbox.onclick = function(){
      document.body.removeChild(lightbox);
    };

    document.body.appendChild(lightbox);
  });
});
</script>

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