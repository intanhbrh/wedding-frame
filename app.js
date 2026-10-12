const W = 1080, H = 1920;
const $ = id => document.getElementById(id);
const video = $("video"), photo = $("photo"), stage = $("stage");
const frameOverlay = $("frameOverlay"), textEl = $("textOverlay"), bgm = $("bgm");

let stream, facing = "user";
let font = "Great Vibes", color = "#ffffff";
let textPos = { x: 0.5, y: 0.82 };

/* ---------- Sound (Web Audio API) ---------- */
let ac;
function beep(freq = 660, dur = 0.12) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq; g.gain.value = 0.08;
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch (e) {}
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Start ---------- */
$("start").onclick = () => {
  $("splash").hidden = true;
  $("app").hidden = false;
  updateText();
  startCamera();
  bgm.volume = 0.4;
  bgm.play().catch(() => {});
};

/* ---------- Music toggle ---------- */
$("music").onclick = () => {
  if (bgm.paused) { bgm.play().catch(() => {}); $("music").textContent = "🎵"; }
  else { bgm.pause(); $("music").textContent = "🔇"; }
};

/* ---------- Camera ---------- */
async function startCamera() {
  try {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
      audio: false
    });
    video.srcObject = stream;
    video.style.transform = facing === "user" ? "scaleX(-1)" : "none";
  } catch (e) {
    alert("Camera not allowed. You can still use Gallery to pick a photo.");
  }
}
$("flip").onclick = () => { facing = facing === "user" ? "environment" : "user"; startCamera(); };

/* ---------- Helpers ---------- */
function drawCover(x, source, sw, sh) {
  const s = Math.max(W / sw, H / sh);
  const dw = sw * s, dh = sh * s;
  x.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function showPhoto() {
  photo.hidden = false; video.hidden = true;
  $("live").hidden = true; $("after").hidden = false;
}

/* ---------- Snap with countdown ---------- */
$("snap").onclick = async () => {
  const cd = $("countdown");
  cd.hidden = false;
  for (let n = 3; n >= 1; n--) { cd.textContent = n; beep(660); await sleep(1000); }
  cd.hidden = true;
  beep(1200, 0.25);

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.save();
  if (facing === "user") { x.translate(W, 0); x.scale(-1, 1); }
  drawCover(x, video, video.videoWidth, video.videoHeight);
  x.restore();
  photo.src = c.toDataURL("image/jpeg", 0.95);
  showPhoto();
};

/* ---------- Gallery ---------- */
$("file").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  photo.src = URL.createObjectURL(f);
  showPhoto();
  e.target.value = "";
};

/* ---------- Retake ---------- */
$("retake").onclick = () => {
  photo.hidden = true; video.hidden = false;
  $("live").hidden = false; $("after").hidden = true;
};

/* ---------- Frames ---------- */
document.querySelectorAll(".frame-thumb").forEach(img => {
  img.onclick = () => {
    document.querySelectorAll(".frame-thumb").forEach(i => i.classList.remove("active"));
    img.classList.add("active");
    frameOverlay.src = img.dataset.src;
  };
});

/* ---------- Text controls ---------- */
function updateText() {
  const scale = stage.clientWidth / W;
  textEl.textContent = $("msg").value;
  textEl.style.fontFamily = `"${font}", cursive`;
  textEl.style.fontSize = (+$("size").value * scale) + "px";
  textEl.style.color = color;
  textEl.style.left = (textPos.x * 100) + "%";
  textEl.style.top = (textPos.y * 100) + "%";
}
$("msg").oninput = updateText;
$("size").oninput = updateText;
window.addEventListener("resize", updateText);

document.querySelectorAll(".font-chip").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".font-chip").forEach(i => i.classList.remove("active"));
    b.classList.add("active");
    font = b.dataset.font;
    updateText();
  };
});
document.querySelectorAll(".swatch").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".swatch").forEach(i => i.classList.remove("active"));
    b.classList.add("active");
    color = b.dataset.color;
    updateText();
  };
});

/* Drag text */
let dragging = false;
textEl.addEventListener("pointerdown", e => { dragging = true; textEl.setPointerCapture(e.pointerId); });
textEl.addEventListener("pointermove", e => {
  if (!dragging) return;
  const r = stage.getBoundingClientRect();
  textPos.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  textPos.y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  updateText();
});
textEl.addEventListener("pointerup", () => { dragging = false; });

/* ---------- Render final image ---------- */
async function render() {
  const size = +$("size").value;
  await document.fonts.load(`${size}px "${font}"`);

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");

  drawCover(x, photo, photo.naturalWidth, photo.naturalHeight);
  if (frameOverlay.naturalWidth) x.drawImage(frameOverlay, 0, 0, W, H);

  const lines = $("msg").value.split("\n");
  x.font = `${size}px "${font}"`;
  x.fillStyle = color;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.shadowColor = "rgba(0,0,0,.35)";
  x.shadowBlur = size * 0.12;
  const lh = size * 1.2;
  const top = textPos.y * H - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => x.fillText(l, textPos.x * W, top + i * lh));

  return new Promise(res => c.toBlob(res, "image/jpeg", 0.92));
}

/* ---------- Save & Share ---------- */
$("save").onclick = async () => {
  const blob = await render();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "wedding-photo.jpg";
  a.click();
};
$("share").onclick = async () => {
  const blob = await render();
  const file = new File([blob], "wedding-photo.jpg", { type: "image/jpeg" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Sarah & Adam's Wedding" }); } catch (e) {}
  } else {
    alert("Sharing isn't supported on this browser. Tap Save, then post from your gallery.");
  }
};