//new
let table;
let items = []; // { row, peaks, rotSpeed, phase }

let outerPadding = 24;
let padding = 12;
let itemSize;
let cols;
let rowsCount;
let canvasHeight;

// rotation tempo-base (usato per calcolare angoli)
let startTime = 0;

function preload() {
  table = loadTable("./dataset_02.csv", "csv", "header");
}

function setup() {
  
  
  // estraggo dati dal CSV e preparo rotazione per ogni item
  for (let r = 0; r < table.getRowCount(); r++) {
    const row = table.getRow(r);
    const peaks = [
      Number(row.get('column0')) || 0,
      Number(row.get('column1')) || 0,
      Number(row.get('column2')) || 0,
      Number(row.get('column3')) || 0,
      Number(row.get('column4')) || 0
    ];

    // calcolo velocità basata sulla magnitudine media (opzionale)
    const meanAbs = (Math.abs(peaks[0]) + Math.abs(peaks[1]) + Math.abs(peaks[2]) + Math.abs(peaks[3]) + Math.abs(peaks[4])) / 5;

    // parametri: maxSpeed è la velocità massima (radiani per secondo)
    const maxSpeed = 0.6; // puoi ridurre (es. 0.3) per rotazioni più lente
    // mappa meanAbs 0..100 -> -maxSpeed..maxSpeed (segno casuale per varietà)
    const baseSpeed = map(meanAbs, 0, 100, -maxSpeed, maxSpeed);
    // slight randomness so not all equal
    const rotSpeed = baseSpeed * (0.6 + Math.random() * 0.8);

    // phase iniziale UGUALE PER TUTTI I GLIFI
    const phase = 0;

    items.push({ row, peaks, rotSpeed, phase });
  }

  calculateLayoutAndCreateCanvas();
  
  

  // start time (in seconds)
  startTime = millis() / 1000;
  // non chiudere il loop: vogliamo animazione
}

function calculateLayoutAndCreateCanvas() {
  
  itemSize = Math.max(64, Math.floor(Math.min(windowWidth, 300) * 0.22));

  cols = Math.floor((windowWidth - outerPadding * 2) / (itemSize + padding));
  if (cols < 1) cols = 1;

  rowsCount = Math.ceil(items.length / cols);

  const totalHeight = outerPadding * 2 + rowsCount * itemSize + (rowsCount - 1) * padding;
  canvasHeight = Math.max(totalHeight, windowHeight);

   // 🔽 CREA IL CANVAS E RENDILO TRASPARENTE
  let canvas = createCanvas(windowWidth, canvasHeight);
  canvas.style('background', 'transparent');

  // 🔽 opzionale, ma utile se vuoi che resti davanti al gradiente
  canvas.style('z-index', '1');
  canvas.style('position', 'relative');

  background(255); // puoi anche rimuovere questa riga se vuoi trasparenza totale
  
  
  // drawGrid verrà chiamata da draw() ad ogni frame
}

function draw() {
  
  // tempo trascorso in secondi
  const t = millis() / 1000;

  // sfondo

  background(255);
  


  // disegno la griglia applicando la rotazione per ogni glifo
  drawGrid(items, outerPadding, padding, itemSize, cols, t);
}

function drawGrid(items, outerPadding, padding, itemSize, cols, t) {
 
  let colCounter = 0;
  let rowCounter = 0;

  for (let i = 0; i < items.length; i++) {
    const xPos = outerPadding + colCounter * (itemSize + padding);
    const yPos = outerPadding + rowCounter * (itemSize + padding);

    const cx = xPos + itemSize / 2;
    const cy = yPos + itemSize / 2;

    // box leggero (opzionale)
    noFill();
    stroke(255);
    strokeWeight(1);
    rect(xPos, yPos, itemSize, itemSize, 10);

    // parametri generali del glifo (non toccare il layout)
    const outerDiameter = itemSize * 0.86;      // diametro visivo complessivo
    const baseR = (outerDiameter / 2) * 0.98;   // raggio di riferimento corrispondente a fattore 1.0

    push();
    translate(cx, cy);

    // CALCOLO angolo per questo item: phase + speed * t
    const item = items[i];
    const angle =  t/5; // radianti

    // applichiamo rotazione SOLO al contesto locale del glifo
    rotate(angle);

    // disegno la forma esattamente come prima (nessuna modifica alla shape)
    drawGlyphNew(item.peaks, baseR);

    pop();

    // avanzamento nella griglia
    colCounter++;
    if (colCounter >= cols) {
      colCounter = 0;
      rowCounter++;
    }
  }
}

/* ---------------- funzione principale per il nuovo glifo (ESATTAMENTE LA TUA) ----------------
   peaks: array di 5 valori -100..100
   baseR: raggio corrispondente a rFactor = 1.0
   Attenzione: NON ho cambiato la logica della forma. Ho solo fatto ruotare i glifi
*/
function drawGlyphNew(peaks, baseR) {
  // sicurezza: peaks lunghezza 5
  const sectors = 5;
  const sectorAngle = TWO_PI / sectors;
  const startAngle = -HALF_PI; // primo settore bisettrice in alto (-90 deg)
  const samplesPerSector = 64; // più alto = più liscio

  // 1) costruisco i punti della forma nera che passa per il rFactor centrale di ogni settore
  const pts = [];
  for (let s = 0; s < sectors; s++) {
    const rawVal = peaks[s] || 0;
    // mappa -100..100 -> 0.5..1.5 (negativi -> <1.0, zero -> 1.0, positivi -> >1.0)
    const centerFactor = map(rawVal, -100, 100, 0.5, 1.5);
    const sectorStart = startAngle + s * sectorAngle;
    for (let k = 0; k < samplesPerSector; k++) {
      const t = k / (samplesPerSector - 1); // 0..1 all'interno dello spicchio
      // envelope: 0 ai bordi, 1 al centro
      const env = Math.sin(PI * t); // sin(pi*t): 0..1..0
      // interpolazione fattore radiale: ai bordi 1.0, al centro centerFactor
      const rFactor = 1.0 + (centerFactor - 1.0) * env;
      const r = baseR * rFactor;
      const ang = sectorStart + t * sectorAngle;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      pts.push({ x, y });
    }
  }

  // per smoothing con curveVertex, preparo array duplicando alcuni punti
  const curvePts = [];
  const N = pts.length;
  // aggiungo ultimi 3 per avvio morbido della curva
  curvePts.push(pts[N - 3], pts[N - 2], pts[N - 1]);
  for (let p of pts) curvePts.push(p);
  // chiudo con primi 3
  curvePts.push(pts[0], pts[1], pts[2]);

  // 2) disegno la shape nera piena (shape completa)
  noStroke();
  fill(0);
  beginShape();
  for (let p of curvePts) {
    // uso curveVertex per morbidezza
    curveVertex(p.x, p.y);
  }
  endShape(CLOSE);

  // 3) ora creo la circonferenza piena corrispondente a rFactor = 1.0 (baseR)
  //    e la sottraggo dalla precedente forma usando globalCompositeOperation = 'destination-out'
  const ctx = drawingContext;
  ctx.save();
  // destination-out: la forma disegnata cancella i pixel già presenti -> l'intersezione diventa trasparente
  ctx.globalCompositeOperation = 'destination-out';

  // disegno il cerchio pieno (qualsiasi colore, sarà usato come maschera)
  // NON modifico colori o comportamento della tua funzione originale
  blendMode(DIFFERENCE);
  noStroke();
  fill(255);
  ellipse(0, 0, baseR * 2, baseR * 2);

  ctx.restore();
}

/* helper */
function polarToCartesian(r, angle) {
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function windowResized() {
  // ricalcolo layout e ridimensiono canvas
  itemSize = Math.max(64, Math.floor(Math.min(windowWidth, 300) * 0.22));
  cols = Math.floor((windowWidth - outerPadding * 2) / (itemSize + padding));
  if (cols < 1) cols = 1;
  rowsCount = Math.ceil(items.length / cols);

  const totalHeight = outerPadding * 2 + rowsCount * itemSize + (rowsCount - 1) * padding;
  canvasHeight = Math.max(totalHeight, windowHeight);

  resizeCanvas(windowWidth, canvasHeight);
  background(255);
}
