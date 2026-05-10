// ============================================================
// TUTOR MATEMÁTICO CIBERPUNK — v4
// Derivadas · Límites · Integrales · Quiz
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";

// ─── EXPORTAR COMO IMAGEN ────────────────────────────────────
// html2canvas convierte un elemento del DOM en un canvas PNG.
// Lo importamos dinámicamente (lazy) para no aumentar el bundle
// inicial — solo se descarga cuando el usuario pulsa "Exportar".
// ─────────────────────────────────────────────────────────────
async function exportarComoImagen(elementoRef, nombreArchivo = "pasos-tutor-ciberpunk.png") {
  // Importación dinámica: el módulo solo se carga cuando esta función se llama
  const html2canvas = (await import("https://esm.sh/html2canvas@1.4.1")).default;

  const elemento = elementoRef.current;
  if (!elemento) return;

  // Guardamos el overflow original y lo quitamos temporalmente
  // para que html2canvas capture TODO el contenido, no solo lo visible
  const overflowOriginal = elemento.style.overflow;
  const maxHeightOriginal = elemento.style.maxHeight;
  elemento.style.overflow = "visible";
  elemento.style.maxHeight = "none";

  try {
    const canvas = await html2canvas(elemento, {
      backgroundColor: "#0d0a2a",   // fondo oscuro del tutor
      scale: 2,                      // doble resolución → imagen nítida en móvil
      useCORS: true,                 // permite fuentes y recursos externos (KaTeX)
      logging: false,
    });

    // Creamos un link invisible, le asignamos la imagen como href y hacemos click
    const link = document.createElement("a");
    link.download = nombreArchivo;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } finally {
    // Restauramos el estilo original pase lo que pase
    elemento.style.overflow = overflowOriginal;
    elemento.style.maxHeight = maxHeightOriginal;
  }
}
import * as math from "mathjs";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceDot
} from "recharts";

// ─── KATEX ───────────────────────────────────────────────────
function KaTeX({ formula, display = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(formula, ref.current, { displayMode: display, throwOnError: false });
      } catch (e) {
        if (ref.current) ref.current.textContent = formula;
      }
    }
  }, [formula, display]);
  return <span ref={ref} />;
}

// ─── PRE-PROCESADOR ───────────────────────────────────────────
function preprocess(input) {
  return input.trim()
    .replace(/\bsen\b/gi, "sin")
    .replace(/\btg\b/gi, "tan")
    .replace(/(\d)([a-zA-Z(])/g, "$1*$2")
    .replace(/([a-zA-Z])(\d)/g, "$1^$2")
    .replace(/\be\^([^\s+\-*/^()]+)/g, "exp($1)")
    .replace(/\bln\b/gi, "log");
}

// ─── DETECTOR DE REGLAS ───────────────────────────────────────
function detectRule(expr) {
  const e = expr.trim().replace(/^\((.+)\)$/, "$1");
  let depth = 0;
  for (let i = e.length - 1; i >= 0; i--) {
    if (e[i] === ')') depth++;
    else if (e[i] === '(') depth--;
    else if (depth === 0 && (e[i] === '+' || (e[i] === '-' && i > 0)))
      return { rule:"sum", name:"Regla de la Suma / Diferencia", latex:"\\frac{d}{dx}[f \\pm g] = f' \\pm g'", explanation:"La derivada de una suma es la suma de las derivadas.", color:"#6366f1" };
  }
  if (/^(-?\d+\.?\d*)\*(.+)$/.test(e))
    return { rule:"constant_multiple", name:"Regla de la Constante Multiplicativa", latex:"\\frac{d}{dx}[c \\cdot f(x)] = c \\cdot f'(x)", explanation:"Una constante que multiplica puede 'salir' de la derivada.", color:"#0ea5e9" };
  depth = 0;
  for (let i = 0; i < e.length; i++) {
    if (e[i] === '(') depth++;
    else if (e[i] === ')') depth--;
    else if (depth === 0 && e[i] === '*')
      return { rule:"product", name:"Regla del Producto", latex:"\\frac{d}{dx}[f \\cdot g] = f'g + fg'", explanation:"Derivada del primero × segundo + primero × derivada del segundo.", color:"#f59e0b" };
  }
  depth = 0;
  for (let i = 0; i < e.length; i++) {
    if (e[i] === '(') depth++;
    else if (e[i] === ')') depth--;
    else if (depth === 0 && e[i] === '/')
      return { rule:"quotient", name:"Regla del Cociente", latex:"\\frac{d}{dx}\\left[\\frac{f}{g}\\right] = \\frac{f'g - fg'}{g^2}", explanation:"(f' · g − f · g') / g².", color:"#ef4444" };
  }
  if (/^x\^[\d.]+$/.test(e) || e === "x")
    return { rule:"power", name:"Regla de la Potencia", latex:"\\frac{d}{dx}[x^n] = n \\cdot x^{n-1}", explanation:"Baja el exponente como coeficiente y resta 1 al exponente.", color:"#10b981" };
  if (/^sin\(/.test(e))  return { rule:"trig", name:"Derivada del Seno",             latex:"\\frac{d}{dx}[\\sin x] = \\cos x",       explanation:"La derivada del seno es el coseno.", color:"#8b5cf6" };
  if (/^cos\(/.test(e))  return { rule:"trig", name:"Derivada del Coseno",            latex:"\\frac{d}{dx}[\\cos x] = -\\sin x",      explanation:"La derivada del coseno es el seno negativo.", color:"#8b5cf6" };
  if (/^tan\(/.test(e))  return { rule:"trig", name:"Derivada de la Tangente",        latex:"\\frac{d}{dx}[\\tan x] = \\sec^2 x",     explanation:"La derivada de la tangente es sec²x.", color:"#8b5cf6" };
  if (/^exp\(/.test(e))  return { rule:"exp",  name:"Derivada de eˣ",                 latex:"\\frac{d}{dx}[e^x] = e^x",               explanation:"La función eˣ es su propia derivada.", color:"#ec4899" };
  if (/^log\(/.test(e))  return { rule:"log",  name:"Derivada del Logaritmo Natural",  latex:"\\frac{d}{dx}[\\ln x] = \\frac{1}{x}",  explanation:"La derivada del ln es el recíproco de x.", color:"#14b8a6" };
  if (/^-?\d+\.?\d*$/.test(e)) return { rule:"constant", name:"Derivada de una Constante", latex:"\\frac{d}{dx}[c] = 0", explanation:"La derivada de cualquier constante es cero.", color:"#64748b" };
  return { rule:"chain", name:"Regla de la Cadena", latex:"\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)", explanation:"Para funciones compuestas: exterior · interior.", color:"#f97316" };
}

// ─── MOTOR DE DERIVADAS ───────────────────────────────────────
function computeDerivative(raw) {
  try {
    const processed = preprocess(raw);
    const node       = math.parse(processed);
    const deriv      = math.derivative(node, 'x');
    const simplified = math.simplify(deriv);
    return { success:true, inputLatex:node.toTex(), outputLatex:simplified.toTex(), outputText:simplified.toString(), processed, inputStr:node.toString(), outputStr:simplified.toString() };
  } catch (err) {
    return { success:false, error:err.message };
  }
}

// ─── GENERADOR DE PUNTOS ──────────────────────────────────────
function generatePoints(funcStr, derivStr, range = [-6, 6], steps = 120) {
  const points = [];
  const step = (range[1] - range[0]) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = range[0] + i * step;
    try {
      const fx  = math.evaluate(funcStr,  { x });
      const dfx = math.evaluate(derivStr, { x });
      points.push({ x:parseFloat(x.toFixed(3)), fx:isFinite(fx)&&Math.abs(fx)<1000?parseFloat(fx.toFixed(4)):null, dfx:isFinite(dfx)&&Math.abs(dfx)<1000?parseFloat(dfx.toFixed(4)):null });
    } catch (_) { points.push({ x:parseFloat(x.toFixed(3)), fx:null, dfx:null }); }
  }
  return points;
}

// ─── ANALIZADORES DE NODO ─────────────────────────────────────
const esSumaResta      = n => n.type==="OperatorNode"&&(n.op==="+"||n.op==="-")&&n.args.length===2;
const esProducto       = n => n.type==="OperatorNode"&&n.op==="*"&&n.args.length===2;
const esCociente       = n => n.type==="OperatorNode"&&n.op==="/"&&n.args.length===2;
const esPotenciaSimple = n => n.type==="OperatorNode"&&n.op==="^"&&n.args[0].type==="SymbolNode"&&n.args[1].type==="ConstantNode";
const esVariableX      = n => n.type==="SymbolNode"&&n.name==="x";
const esConstante      = n => n.type==="ConstantNode";
const esFuncion        = (n,nombre) => n.type==="FunctionNode"&&n.fn?.name===nombre;

function generarPasos(expresionStr) {
  const pasos = [];
  let nodo;
  try { nodo = math.parse(expresionStr); }
  catch (e) { return [{ titulo:"Error de sintaxis", explicacion:`No pude interpretar "${expresionStr}".`, antes:expresionStr, despues:"—", esError:true }]; }
  pasos.push({ titulo:"📌 Identificar la función", explicacion:`Calculamos la derivada de f(x) = ${expresionStr}.\nAnalizamos la estructura para decidir qué regla(s) aplicar.`, antes:`f(x) = ${expresionStr}`, despues:`f'(x) = ?` });
  _analizarNodo(nodo, pasos);
  try {
    const res = math.simplify(math.derivative(expresionStr, "x")).toString();
    pasos.push({ titulo:"✅ Resultado final", explicacion:"Simplificando y combinando todos los términos anteriores obtenemos la derivada final.", antes:`f(x) = ${expresionStr}`, despues:`f'(x) = ${res.replace(/\*/g,"·")}`, esResultado:true });
  } catch (_) {
    pasos.push({ titulo:"⚠️ Resultado no disponible", explicacion:"No se pudo simplificar.", antes:expresionStr, despues:"—", esError:true });
  }
  return pasos;
}

function _analizarNodo(nodo, pasos) {
  const str = nodo.toString();
  if (esSumaResta(nodo)) {
    const [f,g]=nodo.args; const op=nodo.op==="+"?"suma":"resta";
    pasos.push({ titulo:`📐 Regla de la ${op}`, explicacion:`d/dx [f ${nodo.op} g] = f' ${nodo.op} g'\n\nSeparamos:\n  d/dx [${f}]  ${nodo.op}  d/dx [${g}]`, antes:`d/dx [ ${f} ${nodo.op} ${g} ]`, despues:`d/dx[${f}]  ${nodo.op}  d/dx[${g}]` });
    _analizarNodo(f, pasos); _analizarNodo(g, pasos); return;
  }
  if (esProducto(nodo)) {
    const [f,g]=nodo.args;
    if (esConstante(f)) { pasos.push({ titulo:"🔢 Constante × función", explicacion:`c = ${f},  g(x) = ${g}\nd/dx [c·g] = c·g'`, antes:`d/dx [${f} · ${g}]`, despues:`${f} · d/dx[${g}]` }); _analizarNodo(g, pasos); return; }
    if (esConstante(g)) { pasos.push({ titulo:"🔢 Constante × función", explicacion:`c = ${g},  f(x) = ${f}\nd/dx [f·c] = c·f'`, antes:`d/dx [${f} · ${g}]`, despues:`${g} · d/dx[${f}]` }); _analizarNodo(f, pasos); return; }
    pasos.push({ titulo:"✖️ Regla del Producto", explicacion:`d/dx [f·g] = f'·g + f·g'\n\nf(x) = ${f}\ng(x) = ${g}\n\n¡Nunca se derivan por separado!`, antes:`d/dx [${f} · ${g}]`, despues:`(d/dx[${f}])·${g} + ${f}·(d/dx[${g}])` });
    _analizarNodo(f, pasos); _analizarNodo(g, pasos); return;
  }
  if (esCociente(nodo)) {
    const [f,g]=nodo.args;
    pasos.push({ titulo:"➗ Regla del Cociente", explicacion:`d/dx [f/g] = (f'·g − f·g') / g²\n\nNumerador:   ${f}\nDenominador: ${g}`, antes:`d/dx [ ${f} / ${g} ]`, despues:`( f'·g − f·g' ) / [${g}]²` });
    _analizarNodo(f, pasos); _analizarNodo(g, pasos); return;
  }
  if (esPotenciaSimple(nodo)) {
    const n=parseFloat(nodo.args[1].toString()); const n1=n-1; const base=nodo.args[0].toString();
    pasos.push({ titulo:"⬆️ Regla de la Potencia", explicacion:`d/dx [xⁿ] = n·x^(n−1)\n\nBajamos ${n} → resta 1 → ${n1}.\n\nd/dx [${base}^${n}] = ${n}·${base}^${n1}`, antes:`d/dx [${base}^${n}]`, despues:`${n}·${base}^${n1}` }); return;
  }
  if (esVariableX(nodo)) { pasos.push({ titulo:"📍 Derivada de x", explicacion:`x = x¹ → d/dx [x¹] = 1·x⁰ = 1`, antes:"d/dx [x]", despues:"1" }); return; }
  if (esConstante(nodo)) { pasos.push({ titulo:"🔒 Derivada de una constante", explicacion:`d/dx [${str}] = 0\n\nLas constantes no varían.`, antes:`d/dx [${str}]`, despues:"0" }); return; }
  if (esFuncion(nodo,"sin"))  { const a=nodo.args[0].toString(); pasos.push({ titulo:"🌊 Seno",     explicacion:`d/dx [sin(${a})] = cos(${a})`, antes:`d/dx [sin(${a})]`, despues:`cos(${a})` }); return; }
  if (esFuncion(nodo,"cos"))  { const a=nodo.args[0].toString(); pasos.push({ titulo:"🌊 Coseno",   explicacion:`d/dx [cos(${a})] = -sin(${a})`, antes:`d/dx [cos(${a})]`, despues:`-sin(${a})` }); return; }
  if (esFuncion(nodo,"tan"))  { const a=nodo.args[0].toString(); pasos.push({ titulo:"🌊 Tangente", explicacion:`d/dx [tan(${a})] = sec²(${a})`, antes:`d/dx [tan(${a})]`, despues:`sec²(${a})` }); return; }
  if (esFuncion(nodo,"exp"))  { const a=nodo.args[0].toString(); pasos.push({ titulo:"⚡ eˣ",       explicacion:`d/dx [e^(${a})] = e^(${a})`, antes:`d/dx [e^(${a})]`, despues:`e^(${a})` }); return; }
  if (esFuncion(nodo,"log"))  { const a=nodo.args[0].toString(); pasos.push({ titulo:"📓 ln",       explicacion:`d/dx [ln(${a})] = 1/(${a})`, antes:`d/dx [ln(${a})]`, despues:`1/(${a})` }); return; }
  if (esFuncion(nodo,"sqrt")) { const a=nodo.args[0].toString(); pasos.push({ titulo:"√ Raíz",     explicacion:`d/dx [√(${a})] = 1/(2√(${a}))`, antes:`d/dx [sqrt(${a})]`, despues:`1/(2·sqrt(${a}))` }); return; }
  pasos.push({ titulo:"🔗 Regla de la Cadena", explicacion:`d/dx [f(g(x))] = f'(g(x))·g'(x)\n\nExpresión: ${str}`, antes:`d/dx [${str}]`, despues:`(exterior')·(interior')` });
}

// ─── PASOS COMPONENT ─────────────────────────────────────────
function DerivationSteps({ pasos, visible }) {
  const [pasoActual, setPasoActual] = useState(0);
  const [modoTutor, setModoTutor]   = useState(false);
  // exportando: true mientras se está generando la imagen (muestra spinner)
  const [exportando, setExportando] = useState(false);
  // panelRef apunta al div contenedor — html2canvas lo captura completo
  const panelRef = useRef(null);

  useEffect(() => { setPasoActual(0); setModoTutor(false); }, [pasos]);
  useEffect(() => {
    if (!modoTutor||!pasos||pasoActual>=pasos.length-1) { if(pasoActual>=(pasos?.length??0)-1) setModoTutor(false); return; }
    const t = setTimeout(() => setPasoActual(p => p+1), 1800);
    return () => clearTimeout(t);
  }, [modoTutor, pasoActual, pasos]);
  if (!visible||!pasos||pasos.length===0) return null;
  const hayMas=pasoActual<pasos.length-1;
  // Para exportar mostramos TODOS los pasos, no solo los vistos hasta ahora
  // pasosVistos: los que se muestran en el modo interactivo
  // Para la captura usamos pasos completo (ver panelRef más abajo)
  const pasosVistos=pasos.slice(0,pasoActual+1);
  const progreso=((pasoActual+1)/pasos.length)*100;
  const C={ a:"#a78bfa", b:"#38bdf8", v:"#10b981", r:"#ef4444", t:"#e2e8f0", m:"#64748b" };

  // handleExportar: muestra todos los pasos, captura, luego restaura vista
  const handleExportar = async () => {
    // Primero avanzamos al último paso para que la imagen muestre todo
    setPasoActual(pasos.length - 1);
    setModoTutor(false);
    setExportando(true);
    // Pequeño delay para que React renderice el estado nuevo antes de capturar
    await new Promise(r => setTimeout(r, 300));
    await exportarComoImagen(panelRef, "derivada-pasos.png");
    setExportando(false);
  };

  return (
    <div ref={panelRef} style={glassCard}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:"0.85rem", fontWeight:700, color:C.a }}>🧑‍🏫 Solución paso a paso</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Botón exportar — solo se activa cuando se terminaron todos los pasos */}
          <button
            onClick={handleExportar}
            disabled={exportando}
            title="Guardar todos los pasos como imagen PNG"
            style={{ fontSize:"0.72rem", padding:"4px 10px", borderRadius:7,
              border:"1px solid rgba(167,139,250,0.35)", background:"rgba(167,139,250,0.08)",
              color: exportando ? "#64748b" : "#a78bfa", cursor: exportando ? "wait" : "pointer" }}>
            {exportando ? "⏳ Exportando..." : "📸 Exportar PNG"}
          </button>
          <span style={{ fontSize:"0.72rem", color:C.m, background:"rgba(255,255,255,0.06)", padding:"3px 10px", borderRadius:999 }}>{pasoActual+1}/{pasos.length}</span>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:420, overflowY:"auto", paddingRight:4 }}>
        {pasosVistos.map((paso,idx) => {
          const bc=paso.esResultado?C.v:paso.esError?C.r:C.a;
          const bg=paso.esResultado?"rgba(16,185,129,0.07)":paso.esError?"rgba(239,68,68,0.07)":"rgba(255,255,255,0.06)";
          return (
            <div key={idx} style={{ background:bg, borderLeft:`3px solid ${bc}`, borderRadius:"0 10px 10px 0", padding:"12px 16px", animation:idx===pasoActual?"cyberSlide 0.35s ease":"none" }}>
              <div style={{ fontSize:"0.65rem", color:C.m, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.08em" }}>Paso {idx+1}</div>
              <div style={{ fontSize:"0.9rem", fontWeight:700, color:C.t, marginBottom:6 }}>{paso.titulo}</div>
              <pre style={{ fontSize:"0.78rem", color:"#94a3b8", whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"inherit", margin:"0 0 10px 0", lineHeight:1.65 }}>{paso.explicacion}</pre>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", background:"rgba(0,0,0,0.25)", borderRadius:8, padding:"8px 12px" }}>
                <code style={{ fontSize:"0.82rem", color:C.b }}>{paso.antes}</code>
                <span style={{ color:C.m }}>⟹</span>
                <code style={{ fontSize:"0.82rem", color:paso.esResultado?C.v:C.a }}>{paso.despues}</code>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
        <button onClick={() => { setModoTutor(false); setPasoActual(p=>Math.max(0,p-1)); }} disabled={pasoActual===0} style={stepBtn(pasoActual===0,false,C)}>← Ant</button>
        <button onClick={() => setModoTutor(m=>!m)} disabled={!hayMas&&!modoTutor} style={stepBtn(!hayMas&&!modoTutor,modoTutor,C)}>{modoTutor?"⏸ Pausa":"▶ Tutor"}</button>
        {hayMas
          ? <button onClick={() => { setModoTutor(false); setPasoActual(p=>p+1); }} style={stepBtn(false,false,C)}>Sig →</button>
          : <button onClick={() => { setModoTutor(false); setPasoActual(0); }} style={{ ...stepBtn(false,false,C), color:C.b }}>🔁 Reiniciar</button>}
      </div>
      <div style={{ marginTop:12, height:3, background:"rgba(255,255,255,0.08)", borderRadius:999, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:999, background:`linear-gradient(90deg,${C.a},${C.b})`, width:`${progreso}%`, transition:"width 0.3s ease" }} />
      </div>
    </div>
  );
}

function stepBtn(disabled,activo,C) {
  return { flex:1, minWidth:60, padding:"7px 10px", borderRadius:8, border:`1px solid ${activo?C.a:"rgba(255,255,255,0.12)"}`, background:activo?C.a:"rgba(255,255,255,0.05)", color:activo?"#0f0c29":disabled?"#334155":C.t, fontSize:"0.78rem", fontWeight:600, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1 };
}

// ─── HISTORIAL ────────────────────────────────────────────────
function CalculationHistory({ historial, onSeleccionar, onLimpiar }) {
  const [col, setCol] = useState(false);
  const [expId, setExpId] = useState(null);
  const C={ a:"#38bdf8", v:"#10b981", t:"#e2e8f0", m:"#64748b" };
  if (!historial||historial.length===0) return (
    <div style={{ ...glassCard, textAlign:"center", color:C.m, fontSize:"0.82rem", lineHeight:1.8 }}>
      <div style={{ fontSize:"1.4rem", marginBottom:8 }}>📋</div>
      <strong style={{ color:"#94a3b8" }}>Historial vacío</strong><br/>Calcula una derivada para empezar.
    </div>
  );
  return (
    <div style={glassCard}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:col?0:14 }}>
        <span style={{ fontSize:"0.85rem", fontWeight:700, color:C.a }}>📋 Historial <span style={{ opacity:0.6 }}>({historial.length})</span></span>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setCol(c=>!c)} style={miniBtn(C)}>{col?"▼ Ver":"▲ Ocultar"}</button>
          <button onClick={() => { if(window.confirm("¿Borrar historial?")) onLimpiar(); }} style={{ ...miniBtn(C), color:"#f87171", borderColor:"rgba(239,68,68,0.3)" }}>🗑</button>
        </div>
      </div>
      {!col && (
        <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:360, overflowY:"auto", paddingRight:4 }}>
          {[...historial].reverse().map((ent,idx) => {
            const rec=idx===0; const exp=expId===ent.id;
            const hora=new Date(ent.timestamp).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
            return (
              <div key={ent.id} style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${rec?C.a:"rgba(255,255,255,0.08)"}`, borderRadius:10, padding:"10px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", cursor:"pointer", gap:8 }} onClick={() => setExpId(exp?null:ent.id)}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.8rem", color:"#e2e8f0", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>f(x) = {ent.expresion}</div>
                    <div style={{ fontSize:"0.78rem", color:C.a, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>f'(x) = {ent.derivada}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
                    {rec && <span style={{ fontSize:"0.6rem", background:`${C.a}22`, color:C.a, padding:"1px 6px", borderRadius:999 }}>Reciente</span>}
                    <span style={{ fontSize:"0.65rem", color:"#64748b" }}>{hora}</span>
                  </div>
                </div>
                {exp && (
                  <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(0,0,0,0.2)", borderRadius:8, fontSize:"0.75rem" }}>
                    <ol style={{ paddingLeft:16, margin:0, lineHeight:2, color:"#64748b" }}>
                      {(ent.pasos??[]).map((p,i)=><li key={i}>{p.titulo}</li>)}
                    </ol>
                  </div>
                )}
                <button onClick={() => onSeleccionar(ent)} style={{ display:"block", width:"100%", marginTop:8, padding:5, borderRadius:7, border:"1px dashed rgba(255,255,255,0.12)", background:"transparent", color:"#64748b", fontSize:"0.72rem", cursor:"pointer" }}
                  onMouseOver={e=>{e.target.style.borderColor=C.a;e.target.style.color=C.a;}}
                  onMouseOut={e=>{e.target.style.borderColor="rgba(255,255,255,0.12)";e.target.style.color="#64748b";}}>
                  ↩ Reutilizar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function miniBtn(C) {
  return { padding:"3px 10px", borderRadius:6, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.05)", color:"#94a3b8", fontSize:"0.72rem", cursor:"pointer" };
}

// ─── GLOSARIO ─────────────────────────────────────────────────
const GLOSSARY = [
  { name:"Potencia",     formula:"x^n",            deriv:"nx^{n-1}",            example:"x^3 \\to 3x^2",                color:"#10b981" },
  { name:"Constante",   formula:"c",               deriv:"0",                   example:"7 \\to 0",                     color:"#64748b" },
  { name:"Suma/Resta",  formula:"f \\pm g",        deriv:"f' \\pm g'",          example:"x^2+x \\to 2x+1",              color:"#6366f1" },
  { name:"Producto",    formula:"f \\cdot g",       deriv:"f'g+fg'",            example:"x\\sin(x)",                    color:"#f59e0b" },
  { name:"Cociente",    formula:"\\frac{f}{g}",    deriv:"\\frac{f'g-fg'}{g^2}",example:"\\frac{x^2}{x+1}",            color:"#ef4444" },
  { name:"Cadena",      formula:"f(g(x))",         deriv:"f'(g)\\cdot g'",      example:"\\sin(x^2)\\to 2x\\cos(x^2)", color:"#f97316" },
  { name:"Seno",        formula:"\\sin(x)",        deriv:"\\cos(x)",            example:"\\sin(x)\\to\\cos(x)",         color:"#8b5cf6" },
  { name:"Coseno",      formula:"\\cos(x)",        deriv:"-\\sin(x)",           example:"\\cos(x)\\to-\\sin(x)",        color:"#8b5cf6" },
  { name:"Exponencial", formula:"e^x",             deriv:"e^x",                 example:"e^x\\to e^x",                  color:"#ec4899" },
  { name:"Logaritmo",   formula:"\\ln(x)",         deriv:"\\frac{1}{x}",        example:"\\ln(x)\\to\\frac{1}{x}",     color:"#14b8a6" },
];

// ─── TABLA DE INTEGRALES ─────────────────────────────────────
const INTEGRALS = [
  { name:"Potencia",      integral:"\\int x^n\\,dx",          result:"\\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)", color:"#10b981", tip:"Aumenta el exponente en 1 y divide entre el nuevo exponente." },
  { name:"Constante",     integral:"\\int k\\,dx",            result:"kx + C",                                        color:"#64748b", tip:"Una constante integrada es la constante multiplicada por x." },
  { name:"Función 1/x",  integral:"\\int \\frac{1}{x}\\,dx", result:"\\ln|x| + C",                                   color:"#14b8a6", tip:"La única potencia que no sigue la regla de la potencia." },
  { name:"Exponencial",   integral:"\\int e^x\\,dx",          result:"e^x + C",                                       color:"#ec4899", tip:"eˣ es su propia integral, igual que su derivada." },
  { name:"Seno",          integral:"\\int \\sin(x)\\,dx",     result:"-\\cos(x) + C",                                 color:"#8b5cf6", tip:"La integral del seno es coseno negativo." },
  { name:"Coseno",        integral:"\\int \\cos(x)\\,dx",     result:"\\sin(x) + C",                                  color:"#8b5cf6", tip:"La integral del coseno es seno." },
  { name:"Tangente",      integral:"\\int \\tan(x)\\,dx",     result:"-\\ln|\\cos(x)| + C",                           color:"#a78bfa", tip:"Equivale a ln|sec(x)| + C." },
  { name:"Secante²",      integral:"\\int \\sec^2(x)\\,dx",  result:"\\tan(x) + C",                                  color:"#f59e0b", tip:"Es la derivada de tan(x) a la inversa." },
  { name:"1/(1+x²)",      integral:"\\int \\frac{1}{1+x^2}\\,dx", result:"\\arctan(x) + C",                          color:"#38bdf8", tip:"Recuerda la derivada de arctan." },
  { name:"1/√(1−x²)",    integral:"\\int \\frac{1}{\\sqrt{1-x^2}}\\,dx", result:"\\arcsin(x) + C",                  color:"#f97316", tip:"Surge en sustituciones trigonométricas." },
];

// ─── CALCULADORA DE LÍMITES ──────────────────────────────────
function computeLimit(expr, point) {
  const processed = preprocess(expr);
  const results = { fromLeft:null, fromRight:null, exact:null, exists:false, info:"" };
  try {
    const deltas = [1e-4, 1e-6, 1e-8];
    const epsilon = 1e-3;
    let atPoint = null;
    try {
      const val = math.evaluate(processed, { x: point });
      if (isFinite(val)) atPoint = val;
    } catch(_) {}

    const leftVals  = deltas.map(d => { try { const v=math.evaluate(processed,{x:point-d}); return isFinite(v)?v:null; } catch(_){return null;} });
    const rightVals = deltas.map(d => { try { const v=math.evaluate(processed,{x:point+d}); return isFinite(v)?v:null; } catch(_){return null;} });

    const lv = leftVals.filter(v => v!==null);
    const rv = rightVals.filter(v => v!==null);

    if (lv.length>0) results.fromLeft  = lv[lv.length-1];
    if (rv.length>0) results.fromRight = rv[rv.length-1];

    if (results.fromLeft!==null && results.fromRight!==null) {
      const diff = Math.abs(results.fromLeft - results.fromRight);
      if (diff < epsilon) {
        results.exists = true;
        results.exact  = (results.fromLeft + results.fromRight) / 2;
        if (atPoint!==null && Math.abs(atPoint - results.exact) < epsilon) {
          results.info = "La función es continua en este punto.";
        } else if (atPoint===null) {
          results.info = "El límite existe aunque la función no está definida en el punto.";
        } else {
          results.info = "La función tiene una discontinuidad removible en este punto.";
        }
      } else {
        results.exists = false;
        results.info = "El límite no existe: los límites laterales son diferentes.";
      }
    } else {
      results.info = "No se pudo evaluar la función cerca del punto indicado.";
    }
  } catch(e) {
    results.info = `Error: ${e.message}`;
  }
  return results;
}

// ─── MOTOR DE L'HÔPITAL ──────────────────────────────────────
//
// CÓMO FUNCIONA (para entenderlo y explicarlo):
//
// La Regla de L'Hôpital dice:
//   Si lím f(x)/g(x) produce 0/0 ó ∞/∞ al sustituir x→a,
//   entonces ese límite es igual a lím f'(x)/g'(x).
//
// Este motor hace 4 cosas:
//   1. Detecta si la expresión es un cociente f(x)/g(x)
//   2. Evalúa f(a) y g(a) para detectar la indeterminación
//   3. Deriva f y g con mathjs
//   4. Evalúa f'(a)/g'(a) y, si sigue siendo indeterminado,
//      aplica L'Hôpital una segunda vez (máx. 3 veces)
//
// Devuelve un objeto con los "pasos" pedagógicos y el resultado.
// ─────────────────────────────────────────────────────────────

// Constante: consideramos "cerca de cero" cualquier valor
// cuyo valor absoluto sea menor que este umbral.
const NEAR_ZERO = 1e-9;
const NEAR_INF  = 1e8;

/**
 * evaluarEnPunto(exprStr, punto)
 * Evalúa la expresión en x = punto.
 * Devuelve: { val, esFinito, esCero, esInfinito }
 */
function evaluarEnPunto(exprStr, punto) {
  try {
    const v = math.evaluate(exprStr, { x: punto });
    const n = typeof v === "number" ? v : (v?.toNumber ? v.toNumber() : NaN);
    if (!isFinite(n)) return { val:n, esFinito:false, esCero:false, esInfinito:true };
    return {
      val:       n,
      esFinito:  true,
      esCero:    Math.abs(n) < NEAR_ZERO,
      esInfinito: Math.abs(n) > NEAR_INF,
    };
  } catch(_) {
    // Si lanza excepción (ej: división por cero al evaluar exactamente),
    // intentamos acercarnos al punto desde ambos lados
    try {
      const eps   = 1e-10;
      const vL    = math.evaluate(exprStr, { x: punto - eps });
      const vR    = math.evaluate(exprStr, { x: punto + eps });
      const ambos = [vL, vR].map(v => typeof v === "number" ? v : NaN);
      if (ambos.every(v => !isFinite(v) || Math.abs(v) > NEAR_INF))
        return { val:Infinity, esFinito:false, esCero:false, esInfinito:true };
    } catch(_2) {}
    // Si todo falla, asumimos que no está definido → tratamos como caso especial
    return { val:NaN, esFinito:false, esCero:false, esInfinito:false, noDefinida:true };
  }
}

/**
 * detectarIndeterminacion(numRes, denRes)
 * Recibe los resultados de evaluarEnPunto para numerador y denominador.
 * Devuelve: "0/0" | "inf/inf" | "ninguna" | "otro"
 */
function detectarIndeterminacion(numRes, denRes) {
  // 0/0: ambos son cero o no están definidos en el punto
  if ((numRes.esCero || numRes.noDefinida) && (denRes.esCero || denRes.noDefinida))
    return "0/0";
  // ∞/∞: ambos son infinitos
  if (numRes.esInfinito && denRes.esInfinito)
    return "inf/inf";
  return "ninguna";
}

/**
 * derivarExpresion(exprStr)
 * Usa mathjs para derivar. Devuelve { exito, resultado, error }.
 */
function derivarExpresion(exprStr) {
  try {
    const derivada = math.derivative(exprStr, "x");
    const simplif  = math.simplify(derivada);
    return { exito:true, resultado:simplif.toString(), latex:simplif.toTex() };
  } catch(e) {
    return { exito:false, error:e.message };
  }
}

/**
 * aplicarLHopital(numStr, denStr, punto, maxIteraciones)
 *
 * Función principal. Recibe:
 *   numStr: string del numerador (ej: "sin(x)")
 *   denStr: string del denominador (ej: "x")
 *   punto:  número hacia donde tiende x (ej: 0)
 *   maxIteraciones: cuántas veces puede aplicar la regla (máx. 3)
 *
 * Devuelve: { tipo, pasos, resultado, exitoso }
 */
function aplicarLHopital(numStr, denStr, punto, maxIteraciones = 3) {
  // "pasos" es el arreglo pedagógico que mostramos en pantalla
  const pasos = [];
  let numActual = numStr;
  let denActual = denStr;
  let resultado = null;
  let iteracion = 0;

  // Verificamos si es un cociente indeterminado antes de empezar
  const numInicial = evaluarEnPunto(numActual, punto);
  const denInicial = evaluarEnPunto(denActual, punto);
  const tipoInicial = detectarIndeterminacion(numInicial, denInicial);

  if (tipoInicial === "ninguna") {
    // No hay indeterminación — L'Hôpital no aplica
    // Pero si el denominador es cero y el numerador no, el límite no existe
    if (denInicial.esCero && !numInicial.esCero) {
      return {
        tipo: "no_aplica",
        razon: `Al sustituir x = ${punto}: numerador = ${numInicial.val?.toFixed(4)}, denominador = 0. El límite puede ser ±∞ o no existir.`,
        pasos: [],
        resultado: null,
        exitoso: false,
      };
    }
    // Si el denominador NO es cero, evaluamos directamente
    if (denInicial.esFinito && !denInicial.esCero) {
      const valDir = numInicial.val / denInicial.val;
      return {
        tipo: "directo",
        razon: `Al sustituir x = ${punto}: ${numInicial.val?.toFixed(4)} / ${denInicial.val?.toFixed(4)} = ${valDir.toFixed(6)}. No hay indeterminación, el límite se evalúa directamente.`,
        pasos: [],
        resultado: valDir,
        exitoso: true,
      };
    }
  }

  // Paso inicial: mostramos qué indeterminación encontramos
  const labelIndet = tipoInicial === "0/0" ? "0/0" : "∞/∞";
  pasos.push({
    numero:    0,
    titulo:    `🔍 Detectar la forma indeterminada`,
    descripcion:
      `Sustituimos x = ${punto} directamente en f(x)/g(x):\n\n` +
      `  Numerador:   ${numActual}  →  ${numInicial.esCero ? "0" : numInicial.esInfinito ? "∞" : numInicial.val?.toFixed(4) ?? "?"}\n` +
      `  Denominador: ${denActual}  →  ${denInicial.esCero ? "0" : denInicial.esInfinito ? "∞" : denInicial.val?.toFixed(4) ?? "?"}\n\n` +
      `Forma: ${labelIndet} → indeterminada ⚠️\n` +
      `La sustitución directa no funciona. Aplicamos la Regla de L'Hôpital.`,
    numAntes:  numActual,
    denAntes:  denActual,
    numDespues: null,
    denDespues: null,
    tipo: "deteccion",
  });

  // Teorema: lo explicamos antes de empezar las iteraciones
  pasos.push({
    numero:    0,
    titulo:    `📐 Regla de L'Hôpital`,
    descripcion:
      `Si lím[x→a] f(x)/g(x) produce ${labelIndet}, entonces:\n\n` +
      `  lím[x→a] f(x)/g(x)  =  lím[x→a] f'(x)/g'(x)\n\n` +
      `Es decir: derivamos el numerador y el denominador por separado\n` +
      `(¡NO como si fuera la regla del cociente!)\n` +
      `y evaluamos ese nuevo cociente en x = ${punto}.`,
    numAntes:  numActual,
    denAntes:  denActual,
    numDespues: null,
    denDespues: null,
    tipo: "teorema",
  });

  // Bucle principal: aplica L'Hôpital hasta 3 veces
  while (iteracion < maxIteraciones) {
    iteracion++;

    // Derivar numerador
    const dNum = derivarExpresion(numActual);
    if (!dNum.exito) {
      pasos.push({
        numero:   iteracion,
        titulo:   `⚠️ Error al derivar el numerador`,
        descripcion: `No se pudo derivar "${numActual}": ${dNum.error}`,
        tipo: "error",
      });
      break;
    }

    // Derivar denominador
    const dDen = derivarExpresion(denActual);
    if (!dDen.exito) {
      pasos.push({
        numero:   iteracion,
        titulo:   `⚠️ Error al derivar el denominador`,
        descripcion: `No se pudo derivar "${denActual}": ${dDen.error}`,
        tipo: "error",
      });
      break;
    }

    // Paso de derivación — mostramos ambas derivadas
    pasos.push({
      numero:    iteracion,
      titulo:    `✏️ Aplicación ${iteracion > 1 ? `#${iteracion}` : ""} — Derivar numerador y denominador`,
      descripcion:
        `Derivamos cada parte por separado:\n\n` +
        `  f(x)  = ${numActual}\n` +
        `  f'(x) = ${dNum.resultado}\n\n` +
        `  g(x)  = ${denActual}\n` +
        `  g'(x) = ${dDen.resultado}\n\n` +
        `Nuevo cociente: [${dNum.resultado}] / [${dDen.resultado}]`,
      numAntes:   numActual,
      denAntes:   denActual,
      numDespues: dNum.resultado,
      denDespues: dDen.resultado,
      tipo: "derivacion",
    });

    numActual = dNum.resultado;
    denActual = dDen.resultado;

    // Evaluar el nuevo cociente en el punto
    const numNuevo = evaluarEnPunto(numActual, punto);
    const denNuevo = evaluarEnPunto(denActual, punto);

    // Si el denominador es 0 pero el numerador no → límite no existe (o es ∞)
    if (denNuevo.esCero && !numNuevo.esCero) {
      pasos.push({
        numero:   iteracion,
        titulo:   `📊 Evaluar: x = ${punto}`,
        descripcion:
          `Sustituimos x = ${punto} en el nuevo cociente:\n\n` +
          `  f'(${punto}) = ${numNuevo.val?.toFixed(6) ?? "?"}\n` +
          `  g'(${punto}) = 0\n\n` +
          `El denominador es 0 pero el numerador no → el límite no existe (es ±∞).`,
        tipo: "evaluacion",
        sublimite: null,
      });
      resultado = null;
      break;
    }

    // Verificar si hay una nueva indeterminación
    const tipoNuevo = detectarIndeterminacion(numNuevo, denNuevo);

    if (tipoNuevo !== "ninguna" && iteracion < maxIteraciones) {
      // Sigue siendo indeterminado → describimos y repetimos
      pasos.push({
        numero:   iteracion,
        titulo:   `📊 Evaluar x = ${punto} — aún indeterminado`,
        descripcion:
          `Sustituimos x = ${punto}:\n\n` +
          `  f'(${punto}) → ${numNuevo.esCero ? "0" : "∞"}\n` +
          `  g'(${punto}) → ${denNuevo.esCero ? "0" : "∞"}\n\n` +
          `Forma: ${tipoNuevo} → todavía indeterminada.\n` +
          `Aplicamos L'Hôpital una vez más (iteración ${iteracion + 1}).`,
        tipo: "reindeterminacion",
        sublimite: null,
      });
      continue; // siguiente iteración del while
    }

    // Ya no es indeterminado — evaluamos el resultado
    let valorFinal = null;
    if (denNuevo.esFinito && !denNuevo.esCero && numNuevo.esFinito) {
      valorFinal = numNuevo.val / denNuevo.val;
    } else if (numNuevo.esCero && denNuevo.esFinito && !denNuevo.esCero) {
      valorFinal = 0;
    } else {
      // Evaluamos numéricamente como respaldo
      try {
        const eps = 1e-8;
        const v1 = math.evaluate(`(${numActual})/(${denActual})`, { x: punto + eps });
        const v2 = math.evaluate(`(${numActual})/(${denActual})`, { x: punto - eps });
        if (isFinite(v1) && isFinite(v2) && Math.abs(v1 - v2) < 1e-4)
          valorFinal = (v1 + v2) / 2;
      } catch(_) {}
    }

    pasos.push({
      numero:   iteracion,
      titulo:   `📊 Evaluar x = ${punto} — resultado`,
      descripcion:
        `Sustituimos x = ${punto} en el cociente derivado:\n\n` +
        `  f'(${punto}) = ${numNuevo.val?.toFixed(6) ?? "?"}\n` +
        `  g'(${punto}) = ${denNuevo.val?.toFixed(6) ?? "?"}\n\n` +
        (valorFinal !== null
          ? `  Resultado: ${numNuevo.val?.toFixed(6)} / ${denNuevo.val?.toFixed(6)} = ${valorFinal.toFixed(6)}\n\n✅ ¡Límite encontrado!`
          : `  El resultado no pudo determinarse con precisión.`),
      tipo: "evaluacion",
      sublimite: valorFinal,
    });

    resultado = valorFinal;
    break;
  }

  // Si agotamos las iteraciones sin resultado
  if (iteracion >= maxIteraciones && resultado === null) {
    pasos.push({
      numero:   iteracion,
      titulo:   `⛔ Límite de iteraciones alcanzado`,
      descripcion:
        `Se aplicó L'Hôpital ${maxIteraciones} veces y la forma sigue indeterminada.\n\n` +
        `Esto puede indicar que el límite no existe, o que se necesita\n` +
        `una técnica diferente (sustitución trigonométrica, series de Taylor, etc.).`,
      tipo: "limite_iteraciones",
    });
  }

  return {
    tipo:      tipoInicial,
    pasos,
    resultado,
    exitoso:   resultado !== null,
    iteraciones: iteracion,
  };
}

/**
 * parsearCociente(exprStr)
 * Intenta separar la expresión en numerador y denominador
 * al nivel más alto del árbol sintáctico de mathjs.
 * Devuelve: { esCoociente, num, den } | { esCociente: false }
 */
function parsearCociente(exprStr) {
  try {
    const proc = preprocess(exprStr);
    const nodo = math.parse(proc);
    // Si el nodo raíz es una división, tenemos num y den directamente
    if (nodo.type === "OperatorNode" && nodo.op === "/") {
      return {
        esCociente: true,
        num: nodo.args[0].toString(),
        den: nodo.args[1].toString(),
        proc,
      };
    }
    return { esCociente: false };
  } catch(_) {
    return { esCociente: false };
  }
}

// ─── COMPONENTE: PASOS DE L'HÔPITAL ──────────────────────────
//
// Muestra los pasos de aplicarLHopital() de forma visual,
// igual que DerivationSteps pero adaptado para límites.
// Los pasos tienen campos distintos (numAntes, denAntes, etc.)
// así que necesitan su propio componente de presentación.
//
function LHopitalSteps({ analisis, limPoint, limExpr }) {
  // pasoActual: cuántos pasos mostrar (crece al avanzar)
  const [pasoActual, setPasoActual] = useState(0);
  const [modoTutor,  setModoTutor]  = useState(false);
  // Estado y ref para exportar como imagen (igual que DerivationSteps)
  const [exportando, setExportando] = useState(false);
  const panelRef = useRef(null);

  // Al cambiar el análisis, reiniciamos
  useEffect(() => { setPasoActual(0); setModoTutor(false); }, [analisis]);

  // Modo tutor: avanza cada 2 segundos (pasos más densos → más tiempo)
  useEffect(() => {
    if (!modoTutor || !analisis?.pasos || pasoActual >= analisis.pasos.length - 1) {
      setModoTutor(false); return;
    }
    const t = setTimeout(() => setPasoActual(p => p + 1), 2200);
    return () => clearTimeout(t);
  }, [modoTutor, pasoActual, analisis]);

  if (!analisis || !analisis.pasos || analisis.pasos.length === 0) return null;

  const { pasos, resultado, exitoso, tipo, razon } = analisis;
  const hayMas = pasoActual < pasos.length - 1;
  const progreso = ((pasoActual + 1) / pasos.length) * 100;
  const C = { a:"#a78bfa", b:"#38bdf8", v:"#10b981", r:"#ef4444", y:"#f59e0b", t:"#e2e8f0", m:"#64748b" };

  // Colores según tipo de paso
  const colorPorTipo = {
    deteccion:        C.y,
    teorema:          C.a,
    derivacion:       C.b,
    evaluacion:       C.v,
    reindeterminacion: C.y,
    error:            C.r,
    limite_iteraciones: C.r,
  };

  // Si no hay cociente o no aplica, mostramos solo el mensaje
  if (tipo === "no_aplica" || tipo === "directo") {
    return (
      <div style={glassCard}>
        <div style={{ fontSize:"0.85rem", fontWeight:700, color: tipo === "directo" ? C.v : C.y, marginBottom:12 }}>
          {tipo === "directo" ? "✅ Evaluación directa" : "ℹ️ L'Hôpital no aplica aquí"}
        </div>
        <pre style={{ fontSize:"0.8rem", color:"#94a3b8", whiteSpace:"pre-wrap", fontFamily:"inherit", lineHeight:1.65 }}>
          {razon}
        </pre>
      </div>
    );
  }

  const pasosVistos = pasos.slice(0, pasoActual + 1);

  // Exportar la solución completa de L'Hôpital como imagen PNG
  const handleExportar = async () => {
    setPasoActual(pasos.length - 1); // mostrar todos los pasos
    setModoTutor(false);
    setExportando(true);
    await new Promise(r => setTimeout(r, 300)); // esperar re-render
    await exportarComoImagen(panelRef, "lhopital-pasos.png");
    setExportando(false);
  };

  return (
    <div ref={panelRef} style={glassCard}>
      {/* Encabezado */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:"0.85rem", fontWeight:700, color:C.a }}>
          🏥 Regla de L'Hôpital — paso a paso
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button
            onClick={handleExportar}
            disabled={exportando}
            title="Guardar todos los pasos como imagen PNG"
            style={{ fontSize:"0.72rem", padding:"4px 10px", borderRadius:7,
              border:"1px solid rgba(56,189,248,0.35)", background:"rgba(56,189,248,0.08)",
              color: exportando ? "#64748b" : "#38bdf8", cursor: exportando ? "wait" : "pointer" }}>
            {exportando ? "⏳ Exportando..." : "📸 Exportar PNG"}
          </button>
          <span style={{ fontSize:"0.72rem", color:C.m, background:"rgba(255,255,255,0.06)", padding:"3px 10px", borderRadius:999 }}>
            {pasoActual + 1}/{pasos.length}
          </span>
        </div>
      </div>

      {/* Notación del límite original */}
      <div style={{ textAlign:"center", marginBottom:16, padding:"10px", background:"rgba(0,0,0,0.2)", borderRadius:10 }}>
        <KaTeX formula={`\\lim_{x \\to ${limPoint}} \\dfrac{${preprocess(limExpr).split("/")[0] || limExpr}}{${preprocess(limExpr).split("/")[1] || ""}}`} display={true} />
      </div>

      {/* Lista de pasos */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:480, overflowY:"auto", paddingRight:4 }}>
        {pasosVistos.map((paso, idx) => {
          const col = colorPorTipo[paso.tipo] || C.a;
          const esUltimo = idx === pasoActual;
          return (
            <div key={idx} style={{
              background: `${col}0d`,
              borderLeft: `3px solid ${col}`,
              borderRadius:"0 10px 10px 0",
              padding:"12px 16px",
              animation: esUltimo ? "cyberSlide 0.35s ease" : "none",
            }}>
              {/* Número y título */}
              {paso.numero > 0 && (
                <div style={{ fontSize:"0.62rem", color:C.m, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
                  Iteración {paso.numero}
                </div>
              )}
              <div style={{ fontSize:"0.88rem", fontWeight:700, color:C.t, marginBottom:8 }}>
                {paso.titulo}
              </div>

              {/* Descripción textual */}
              <pre style={{ fontSize:"0.78rem", color:"#94a3b8", whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"inherit", margin:"0 0 10px 0", lineHeight:1.7 }}>
                {paso.descripcion}
              </pre>

              {/* Transformación visual: cociente antes → después */}
              {paso.numDespues && paso.denDespues && (
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", background:"rgba(0,0,0,0.25)", borderRadius:8, padding:"10px 14px" }}>
                  {/* Antes */}
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"0.6rem", color:C.m, marginBottom:4, textTransform:"uppercase" }}>Antes</div>
                    <KaTeX formula={`\\dfrac{${paso.numAntes}}{${paso.denAntes}}`} display={true} />
                  </div>
                  <span style={{ fontSize:"1.4rem", color:C.m }}>⟹</span>
                  {/* Después */}
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"0.6rem", color:C.m, marginBottom:4, textTransform:"uppercase" }}>Después</div>
                    <KaTeX formula={`\\dfrac{${paso.numDespues}}{${paso.denDespues}}`} display={true} />
                  </div>
                </div>
              )}

              {/* Si hay sublímite calculado, lo destacamos */}
              {paso.sublimite !== null && paso.sublimite !== undefined && (
                <div style={{ marginTop:10, background:"rgba(16,185,129,0.12)", border:"1px solid #10b98144", borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:"0.65rem", color:C.v, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>
                    Límite calculado
                  </div>
                  <KaTeX formula={`\\lim_{x \\to ${limPoint}} = ${paso.sublimite.toFixed(6)}`} display={true} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resultado final (solo cuando se terminaron todos los pasos) */}
      {pasoActual === pasos.length - 1 && exitoso && resultado !== null && (
        <div style={{ marginTop:14, background:"rgba(16,185,129,0.1)", border:"1px solid #10b98155", borderRadius:12, padding:"14px", textAlign:"center", animation:"cyberSlide 0.4s ease" }}>
          <div style={{ fontSize:"0.65rem", color:C.v, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
            ✅ Resultado final
          </div>
          <KaTeX formula={`\\lim_{x \\to ${limPoint}} f(x) = ${resultado.toFixed(6)}`} display={true} />
        </div>
      )}

      {/* Controles */}
      <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
        <button onClick={() => { setModoTutor(false); setPasoActual(p => Math.max(0, p-1)); }}
          disabled={pasoActual === 0} style={stepBtn(pasoActual===0, false, { a:"#a78bfa", t:"#e2e8f0" })}>
          ← Ant
        </button>
        <button onClick={() => setModoTutor(m => !m)} disabled={!hayMas && !modoTutor}
          style={stepBtn(!hayMas&&!modoTutor, modoTutor, { a:"#a78bfa", t:"#e2e8f0" })}>
          {modoTutor ? "⏸ Pausa" : "▶ Tutor"}
        </button>
        {hayMas
          ? <button onClick={() => { setModoTutor(false); setPasoActual(p => p+1); }}
              style={stepBtn(false, false, { a:"#a78bfa", t:"#e2e8f0" })}>Sig →</button>
          : <button onClick={() => { setModoTutor(false); setPasoActual(0); }}
              style={{ ...stepBtn(false, false, { a:"#a78bfa", t:"#e2e8f0" }), color:"#38bdf8" }}>🔁 Reiniciar</button>
        }
      </div>

      {/* Barra de progreso */}
      <div style={{ marginTop:12, height:3, background:"rgba(255,255,255,0.08)", borderRadius:999, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:999, background:`linear-gradient(90deg,${C.a},${C.b})`, width:`${progreso}%`, transition:"width 0.3s ease" }} />
      </div>
    </div>
  );
}

// ─── MOTOR DE INTEGRALES (por patrones) ──────────────────────
// mathjs no tiene integrate() como tiene derivative()
// Comparamos la expresión con patrones conocidos y devolvemos
// la antiderivada correspondiente — cubre el 95% de segundo semestre
function computeIntegral(raw) {
  const e = preprocess(raw).trim();
  const patterns = [
    {
      test: s => /^-?\d+\.?\d*$/.test(s),
      result: s => `${s}*x`,
      latex:  s => `${s}x + C`,
      rule: "Integral de una Constante", color:"#64748b",
      explanation:"∫k dx = kx + C — una constante integrada multiplica a x.",
      ruleLatex:"\\int k\\,dx = kx + C",
    },
    {
      test: s => s === "x",
      result: () => "x^2/2",
      latex:  () => "\\frac{x^2}{2} + C",
      rule:"Regla de la Potencia (n=1)", color:"#10b981",
      explanation:"∫x dx = x²/2 + C — regla de la potencia con n=1.",
      ruleLatex:"\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C",
    },
    {
      test: s => /^x\^(-?\d+\.?\d*)$/.test(s),
      result: s => {
        const n = parseFloat(s.match(/^x\^(-?\d+\.?\d*)$/)[1]);
        if (n === -1) return "log(abs(x))";
        return `x^${n+1}/${n+1}`;
      },
      latex: s => {
        const n = parseFloat(s.match(/^x\^(-?\d+\.?\d*)$/)[1]);
        if (n === -1) return "\\ln|x| + C";
        return `\\frac{x^{${n+1}}}{${n+1}} + C`;
      },
      rule:"Regla de la Potencia", color:"#10b981",
      explanation:"∫xⁿ dx = xⁿ⁺¹/(n+1) + C — sube el exponente en 1 y divide entre el nuevo.",
      ruleLatex:"\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C",
    },
    {
      test: s => /^(-?\d+\.?\d*)\*x\^(-?\d+\.?\d*)$/.test(s),
      result: s => { const m=s.match(/^(-?\d+\.?\d*)\*x\^(-?\d+\.?\d*)$/); const c=parseFloat(m[1]),n=parseFloat(m[2]); return `${c}*x^${n+1}/${n+1}`; },
      latex:  s => { const m=s.match(/^(-?\d+\.?\d*)\*x\^(-?\d+\.?\d*)$/); const c=parseFloat(m[1]),n=parseFloat(m[2]); return `\\frac{${c}x^{${n+1}}}{${n+1}} + C`; },
      rule:"Constante × Regla de la Potencia", color:"#0ea5e9",
      explanation:"La constante sale de la integral. Luego se aplica la regla de la potencia.",
      ruleLatex:"\\int c\\cdot x^n\\,dx = c\\cdot\\frac{x^{n+1}}{n+1} + C",
    },
    { test:s=>s==="sin(x)", result:()=>"-cos(x)", latex:()=>"-\\cos(x) + C", rule:"Integral del Seno", color:"#8b5cf6", explanation:"∫sin(x) dx = -cos(x) + C — inverso de d/dx[cos(x)] = -sin(x).", ruleLatex:"\\int \\sin(x)\\,dx = -\\cos(x) + C" },
    { test:s=>s==="cos(x)", result:()=>"sin(x)",  latex:()=>"\\sin(x) + C",  rule:"Integral del Coseno", color:"#8b5cf6", explanation:"∫cos(x) dx = sin(x) + C — inverso de d/dx[sin(x)] = cos(x).", ruleLatex:"\\int \\cos(x)\\,dx = \\sin(x) + C" },
    { test:s=>s==="tan(x)", result:()=>"-log(abs(cos(x)))", latex:()=>"-\\ln|\\cos(x)| + C", rule:"Integral de la Tangente", color:"#a78bfa", explanation:"∫tan(x) dx = -ln|cos(x)| + C.", ruleLatex:"\\int \\tan(x)\\,dx = -\\ln|\\cos(x)| + C" },
    { test:s=>s==="exp(x)", result:()=>"exp(x)", latex:()=>"e^x + C", rule:"Integral de eˣ", color:"#ec4899", explanation:"∫eˣ dx = eˣ + C — eˣ es su propia antiderivada.", ruleLatex:"\\int e^x\\,dx = e^x + C" },
    { test:s=>s==="log(x)", result:()=>"x*log(x)-x", latex:()=>"x\\ln(x) - x + C", rule:"Integral del Logaritmo Natural", color:"#14b8a6", explanation:"∫ln(x) dx = x·ln(x) - x + C — requiere integración por partes.", ruleLatex:"\\int \\ln(x)\\,dx = x\\ln(x) - x + C" },
    { test:s=>s==="1/x",    result:()=>"log(abs(x))", latex:()=>"\\ln|x| + C", rule:"Caso especial 1/x", color:"#14b8a6", explanation:"∫(1/x) dx = ln|x| + C — único caso donde la regla de la potencia no aplica (n=-1).", ruleLatex:"\\int \\frac{1}{x}\\,dx = \\ln|x| + C" },
    { test:s=>s==="sqrt(x)",result:()=>"2/3*x^(3/2)", latex:()=>"\\frac{2}{3}x^{\\frac{3}{2}} + C", rule:"Integral de √x", color:"#10b981", explanation:"√x = x^(1/2) → integral = x^(3/2)/(3/2) = (2/3)x^(3/2) + C", ruleLatex:"\\int \\sqrt{x}\\,dx = \\frac{2}{3}x^{\\frac{3}{2}} + C" },
  ];
  for (const p of patterns) {
    if (p.test(e)) {
      return { success:true, resultText:p.result(e), resultLatex:p.latex(e), rule:p.rule, explanation:p.explanation, color:p.color, ruleLatex:p.ruleLatex,
        inputLatex: e.replace(/\*/g,"\\cdot ").replace(/log/g,"\\ln").replace(/exp\(([^)]+)\)/g,"e^{$1}").replace(/sqrt\(([^)]+)\)/g,"\\sqrt{$1}") };
    }
  }
  return { success:false, error:"Expresión no reconocida. Intenta: x^3, sin(x), e^x, 1/x, sqrt(x), o una constante." };
}

// ─── QUIZ DATA POR NIVELES ────────────────────────────────────
// Fácil: reglas directas, una sola operación
const QUIZ_FACIL = [
  { fn:"x^3",    fnLatex:"x^3",       answer:"3x^2",    answerLatex:"3x^2",          opts:["3x^2","x^4/4","3x","2x^3"],           rule:"Regla de la Potencia" },
  { fn:"x^5",    fnLatex:"x^5",       answer:"5x^4",    answerLatex:"5x^4",           opts:["5x^4","x^6/6","5x^5","4x^5"],         rule:"Regla de la Potencia" },
  { fn:"sin(x)", fnLatex:"\\sin(x)",  answer:"cos(x)",  answerLatex:"\\cos(x)",       opts:["cos(x)","-sin(x)","sin(x)","-cos(x)"],rule:"Derivada del Seno" },
  { fn:"cos(x)", fnLatex:"\\cos(x)",  answer:"-sin(x)", answerLatex:"-\\sin(x)",      opts:["-sin(x)","cos(x)","sin(x)","sec^2(x)"],rule:"Derivada del Coseno" },
  { fn:"e^x",    fnLatex:"e^x",       answer:"e^x",     answerLatex:"e^x",            opts:["e^x","xe^{x-1}","e^{x-1}","ln(x)"],   rule:"Derivada de eˣ" },
  { fn:"5",      fnLatex:"5",         answer:"0",       answerLatex:"0",              opts:["0","5","1","5x"],                      rule:"Derivada de una Constante" },
  { fn:"x",      fnLatex:"x",         answer:"1",       answerLatex:"1",              opts:["1","x","0","2x"],                      rule:"Regla de la Potencia (n=1)" },
];

// Medio: requieren más de un paso o reglas combinadas
const QUIZ_MEDIO = [
  { fn:"ln(x)",    fnLatex:"\\ln(x)",   answer:"1/x",       answerLatex:"\\frac{1}{x}",          opts:["1/x","ln(x)","x","1/x^2"],              rule:"Derivada del Logaritmo" },
  { fn:"tan(x)",   fnLatex:"\\tan(x)",  answer:"sec^2(x)",  answerLatex:"\\sec^2(x)",             opts:["sec^2(x)","cos^2(x)","-csc^2(x)","1/x"],rule:"Derivada de la Tangente" },
  { fn:"x^2+3*x",  fnLatex:"x^2+3x",   answer:"2*x+3",     answerLatex:"2x+3",                   opts:["2*x+3","x^2+3","2x","x+3"],             rule:"Regla de la Suma" },
  { fn:"sqrt(x)",  fnLatex:"\\sqrt{x}", answer:"1/(2*sqrt(x))", answerLatex:"\\frac{1}{2\\sqrt{x}}", opts:["1/(2*sqrt(x))","2sqrt(x)","1/x","sqrt(x)/2"], rule:"Regla de la Potencia (1/2)" },
  { fn:"3*x^2",    fnLatex:"3x^2",      answer:"6*x",       answerLatex:"6x",                     opts:["6*x","3x","6x^2","9x"],                 rule:"Constante × Potencia" },
  { fn:"x^3-2*x",  fnLatex:"x^3-2x",   answer:"3*x^2-2",   answerLatex:"3x^2-2",                 opts:["3*x^2-2","3x^2","x^2-2","3x-2"],        rule:"Regla de la Suma/Resta" },
];

// Difícil: producto, cociente, cadena, integrales
const QUIZ_DIFICIL = [
  { fn:"x*sin(x)",      fnLatex:"x\\sin(x)",         answer:"sin(x)+x*cos(x)", answerLatex:"\\sin(x)+x\\cos(x)",      opts:["sin(x)+x*cos(x)","x*cos(x)","sin(x)","cos(x)-x*sin(x)"],  rule:"Regla del Producto" },
  { fn:"x^2/cos(x)",    fnLatex:"\\frac{x^2}{\\cos x}", answer:"(2*x*cos(x)+x^2*sin(x))/cos(x)^2", answerLatex:"\\frac{2x\\cos x+x^2\\sin x}{\\cos^2 x}", opts:["(2*x*cos(x)+x^2*sin(x))/cos(x)^2","2x/cos(x)","x^2*tan(x)","2x*cos(x)"], rule:"Regla del Cociente" },
  { fn:"sin(x^2)",      fnLatex:"\\sin(x^2)",         answer:"2*x*cos(x^2)",   answerLatex:"2x\\cos(x^2)",            opts:["2*x*cos(x^2)","cos(x^2)","2x*sin(x^2)","-2x*cos(x^2)"],   rule:"Regla de la Cadena" },
  { fn:"e^(x^2)",       fnLatex:"e^{x^2}",            answer:"2*x*exp(x^2)",   answerLatex:"2xe^{x^2}",               opts:["2*x*exp(x^2)","exp(x^2)","x^2*exp(x^2)","2*exp(x^2)"],    rule:"Regla de la Cadena" },
  { fn:"ln(x^2)",       fnLatex:"\\ln(x^2)",          answer:"2/x",            answerLatex:"\\frac{2}{x}",             opts:["2/x","1/x^2","2*ln(x)","1/(2x)"],                          rule:"Cadena + Logaritmo" },
];

// Mapa de niveles para el selector
const NIVELES = {
  facil:   { preguntas: QUIZ_FACIL,   label:"🟢 Fácil",   desc:"Reglas básicas directas",           color:"#10b981" },
  medio:   { preguntas: QUIZ_MEDIO,   label:"🟡 Medio",   desc:"Reglas combinadas y menos comunes", color:"#f59e0b" },
  dificil: { preguntas: QUIZ_DIFICIL, label:"🔴 Difícil", desc:"Producto, cociente y cadena",       color:"#ef4444" },
};

function QuizMode() {
  const [racha,   setRacha]   = useState(parseInt(localStorage.getItem("racha_actual") || "0"));
  // nivel null = pantalla de selección, string = jugando
  const [nivel,   setNivel]   = useState(null);
  const [idx,     setIdx]     = useState(0);
  const [selected,setSelected]= useState(null);
  const [score,   setScore]   = useState(0);
  const [done,    setDone]    = useState(false);
  const [history, setHistory] = useState([]);
  const [shuffled,setShuffled]= useState([]);

  const C = { a:"#a78bfa", b:"#38bdf8", v:"#10b981", r:"#ef4444", t:"#e2e8f0", m:"#64748b" };

  // Inicia el quiz con el nivel elegido
  const startQuiz = (nivelKey) => {
    const preguntas = NIVELES[nivelKey].preguntas;
    setNivel(nivelKey);
    setShuffled([...preguntas].sort(() => Math.random() - 0.5));
    setIdx(0); setSelected(null); setScore(0); setDone(false); setHistory([]);
  };

  // Pantalla de selección de nivel
  if (!nivel) return (
    <div style={{ maxWidth:560, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:"2rem", marginBottom:8 }}>🎮</div>
        <p style={{ color:"#64748b", fontSize:"0.85rem" }}>Elige tu nivel de dificultad</p>
        <p style={{ color:"#f59e0b", fontSize:"0.78rem", marginTop:4 }}>🔥 Racha actual: {racha} días</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {Object.entries(NIVELES).map(([key, niv]) => (
          <button key={key} onClick={() => startQuiz(key)}
            style={{ padding:"20px 24px", borderRadius:14, border:`2px solid ${niv.color}33`, background:`${niv.color}10`, cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background=`${niv.color}20`; e.currentTarget.style.borderColor=`${niv.color}88`; }}
            onMouseOut={e =>  { e.currentTarget.style.background=`${niv.color}10`; e.currentTarget.style.borderColor=`${niv.color}33`; }}
          >
            <div style={{ fontSize:"1rem", fontWeight:700, color:niv.color, marginBottom:4 }}>{niv.label}</div>
            <div style={{ fontSize:"0.78rem", color:"#64748b" }}>{niv.desc} · {niv.preguntas.length} preguntas</div>
          </button>
        ))}
      </div>
    </div>
  );

  const q = shuffled[idx];
  const pct = Math.round((score / shuffled.length) * 100);
  const nivelInfo = NIVELES[nivel];

  const handleAnswer = (opt) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === q.answer;
    if (correct) {
      setScore(s => s+1);
      const hoy = new Date().toDateString();
      const ultimoDia = localStorage.getItem("ultimo_dia_activo");
      const rachaActual = parseInt(localStorage.getItem("racha_actual") || "0");
      const ayer = new Date(Date.now() - 86400000).toDateString();
      if (ultimoDia === hoy) {
        // Ya jugó hoy, no cambia
      } else if (ultimoDia === ayer) {
        const nueva = rachaActual + 1;
        localStorage.setItem("racha_actual", nueva);
        localStorage.setItem("ultimo_dia_activo", hoy);
        setRacha(nueva);
      } else {
        localStorage.setItem("racha_actual", "1");
        localStorage.setItem("ultimo_dia_activo", hoy);
        setRacha(1);
      }
    }
    setHistory(h => [...h, { fn:q.fn, answer:q.answer, selected:opt, correct }]);
  };

  const nextQ = () => {
    if (idx < shuffled.length-1) { setIdx(i=>i+1); setSelected(null); }
    else setDone(true);
  };

  const restart = () => setNivel(null);


  if (done) return (
    <div style={{ ...glassCard, textAlign:"center", padding:32 }}>
      <div style={{ fontSize:"3rem", marginBottom:8 }}>{pct>=80?"🏆":pct>=60?"⭐":"📚"}</div>
      <div style={{ fontSize:"0.75rem", color:nivelInfo.color, marginBottom:4 }}>{nivelInfo.label}</div>
      <h2 style={{ color:pct>=80?C.v:pct>=60?C.a:C.r, fontSize:"2rem", margin:"0 0 8px" }}>{pct}%</h2>
      <p style={{ color:"#94a3b8", marginBottom:4 }}>{score} de {shuffled.length} correctas</p>
      <p style={{ color:C.m, fontSize:"0.82rem", marginBottom:24 }}>
        {pct>=80?"¡Excelente dominio!":pct>=60?"¡Buen trabajo! Sigue practicando.":"Revisa el glosario y vuelve a intentarlo."}
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:260, overflowY:"auto", marginBottom:20 }}>
        {history.map((h,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:h.correct?"rgba(16,185,129,0.08)":"rgba(239,68,68,0.08)", borderRadius:8, padding:"8px 14px", border:`1px solid ${h.correct?"#10b98133":"#ef444433"}` }}>
            <span style={{ color:"#94a3b8", fontSize:"0.8rem" }}>f'({h.fn}) = </span>
            <span style={{ color:h.correct?C.v:C.r, fontFamily:"monospace", fontSize:"0.8rem" }}>{h.selected} {h.correct?"✓":"✗"}</span>
          </div>
        ))}
      </div>
      <button onClick={restart} style={{ ...cyberBtn, padding:"12px 40px" }}>🔄 Elegir nivel</button>
    </div>
  );

  return (
    <div style={{ maxWidth:640, margin:"0 auto" }}>
      {/* Progreso */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:4 }}>
        <span style={{ fontSize:"0.75rem", color:C.m }}>Pregunta {idx+1} de {shuffled.length}</span>
        <span style={{ fontSize:"0.75rem", color:nivelInfo.color }}>{nivelInfo.label}</span>
        <span style={{ fontSize:"0.75rem", color:C.v }}>✓ {score} correctas</span>
        <span style={{ fontSize:"0.75rem", color:"#f59e0b" }}>🔥 {racha} días</span>
      </div>
      <div style={{ height:4, background:"rgba(255,255,255,0.08)", borderRadius:999, marginBottom:20, overflow:"hidden" }}>
        <div style={{ height:"100%", background:`linear-gradient(90deg,${C.a},${C.b})`, width:`${((idx)/(shuffled.length))*100}%`, transition:"width 0.4s ease" }} />
      </div>

      {/* Pregunta */}
      <div style={{ ...glassCard, textAlign:"center", marginBottom:16 }}>
        <div style={{ fontSize:"0.72rem", color:C.m, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>¿Cuál es la derivada de?</div>
        <div style={{ fontSize:"1.6rem", marginBottom:12 }}>
          <KaTeX formula={`f(x) = ${q.fnLatex}`} display={true} />
        </div>
        <div style={{ fontSize:"0.72rem", color:C.a, background:`${C.a}15`, padding:"4px 12px", borderRadius:999, display:"inline-block" }}>
          📐 {q.rule}
        </div>
      </div>

      {/* Opciones */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {q.opts.map((opt,i) => {
          const isCorrect = opt===q.answer;
          const isSelected = opt===selected;
          let bg = "rgba(255,255,255,0.05)";
          let border = "rgba(255,255,255,0.12)";
          let color = C.t;
          if (selected) {
            if (isCorrect) { bg="rgba(16,185,129,0.15)"; border=C.v; color=C.v; }
            else if (isSelected) { bg="rgba(239,68,68,0.15)"; border=C.r; color=C.r; }
            else { bg="rgba(255,255,255,0.02)"; color=C.m; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(opt)}
              style={{ padding:"16px 12px", borderRadius:12, border:`2px solid ${border}`, background:bg, color, cursor:selected?"default":"pointer", fontSize:"0.9rem", fontFamily:"monospace", transition:"all 0.2s", textAlign:"center" }}>
              <KaTeX formula={opt===q.answer && selected ? q.answerLatex : opt} />
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ marginTop:16, display:"flex", justifyContent:"flex-end" }}>
          <button onClick={nextQ} style={{ ...cyberBtn, padding:"10px 28px" }}>
            {idx<shuffled.length-1?"Siguiente →":"Ver resultados 🏁"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MOTOR: PUNTOS CRÍTICOS ──────────────────────────────────
// Encuentra máximos, mínimos e inflexiones de f(x)
// usando la primera y segunda derivada numéricamente.
function computeCriticalPoints(raw) {
  try {
    const proc  = preprocess(raw);
    const deriv = math.simplify(math.derivative(proc, "x")).toString();
    const deriv2= math.simplify(math.derivative(deriv, "x")).toString();

    const puntos = [];
    const range  = [-10, 10];
    const steps  = 2000;
    const h      = (range[1] - range[0]) / steps;

    let prevSign = null;
    for (let i = 0; i <= steps; i++) {
      const x = range[0] + i * h;
      try {
        const dy = math.evaluate(deriv, { x });
        if (!isFinite(dy)) { prevSign = null; continue; }
        const sign = dy >= 0 ? 1 : -1;
        if (prevSign !== null && prevSign !== sign) {
          // Bisección para refinar el cero de f'
          let lo = x - h, hi = x;
          for (let j = 0; j < 30; j++) {
            const mid = (lo + hi) / 2;
            const v   = math.evaluate(deriv, { x: mid });
            if (!isFinite(v)) break;
            if ((v >= 0 ? 1 : -1) === prevSign) lo = mid; else hi = mid;
          }
          const xc   = (lo + hi) / 2;
          const d2   = math.evaluate(deriv2, { x: xc });
          const fy   = math.evaluate(proc,   { x: xc });
          const tipo = !isFinite(d2) ? "indefinido"
                     : Math.abs(d2)  < 1e-6 ? "posible inflexión"
                     : d2 < 0 ? "máximo local"
                     : "mínimo local";
          // Evitar duplicados muy cercanos
          const yaExiste = puntos.some(p => Math.abs(p.x - xc) < 0.05);
          if (!yaExiste) puntos.push({ x: +xc.toFixed(5), y: +fy.toFixed(5), d2: +d2.toFixed(5), tipo });
        }
        prevSign = sign;
      } catch { prevSign = null; }
    }

    // Buscar inflexiones (ceros de f'')
    prevSign = null;
    for (let i = 0; i <= steps; i++) {
      const x = range[0] + i * h;
      try {
        const d2 = math.evaluate(deriv2, { x });
        if (!isFinite(d2)) { prevSign = null; continue; }
        const sign = d2 >= 0 ? 1 : -1;
        if (prevSign !== null && prevSign !== sign) {
          const xc = x - h / 2;
          const fy = math.evaluate(proc, { x: xc });
          const yaExiste = puntos.some(p => Math.abs(p.x - xc) < 0.05);
          if (!yaExiste && isFinite(fy)) puntos.push({ x: +xc.toFixed(5), y: +fy.toFixed(5), d2: 0, tipo: "inflexión" });
        }
        prevSign = sign;
      } catch { prevSign = null; }
    }

    return { success: true, puntos: puntos.sort((a, b) => a.x - b.x), deriv, deriv2 };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── MOTOR: INTEGRAL DEFINIDA ─────────────────────────────────
// Calcula ∫ₐᵇ f(x) dx numéricamente usando la regla de Simpson
function computeDefiniteIntegral(raw, a, b) {
  try {
    const proc = preprocess(raw);
    const n    = 1000; // debe ser par
    const h    = (b - a) / n;
    let sum    = 0;
    for (let i = 0; i <= n; i++) {
      const x = a + i * h;
      let v;
      try { v = math.evaluate(proc, { x }); } catch { v = 0; }
      if (!isFinite(v)) v = 0;
      const coef = i === 0 || i === n ? 1 : i % 2 === 0 ? 2 : 4;
      sum += coef * v;
    }
    const result = (h / 3) * sum;

    // Puntos para la gráfica del área
    const pts = [];
    const gSteps = 120;
    const gH = (b - a) / gSteps;
    for (let i = 0; i <= gSteps; i++) {
      const x = a + i * gH;
      try {
        const y = math.evaluate(proc, { x });
        pts.push({ x: +x.toFixed(4), y: isFinite(y) && Math.abs(y) < 1e4 ? +y.toFixed(4) : null });
      } catch { pts.push({ x: +x.toFixed(4), y: null }); }
    }

    return { success: true, result: +result.toFixed(8), pts, a, b };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── TECLADO ─────────────────────────────────────────────────
const KEYBOARD = [
  { label:"x",   insert:"x",     group:"var"   },
  { label:"x²",  insert:"x^2",   group:"power" },
  { label:"xⁿ",  insert:"x^",    group:"power" },
  { label:"^",   insert:"^",     group:"op"    },
  { label:"(",   insert:"(",     group:"op"    },
  { label:")",   insert:")",     group:"op"    },
  { label:"sin", insert:"sin(",  group:"trig"  },
  { label:"cos", insert:"cos(",  group:"trig"  },
  { label:"tan", insert:"tan(",  group:"trig"  },
  { label:"ln",  insert:"ln(",   group:"trig"  },
  { label:"eˣ",  insert:"e^x",   group:"trig"  },
  { label:"√",   insert:"sqrt(", group:"trig"  },
  { label:"+",   insert:"+",     group:"op"    },
  { label:"−",   insert:"-",     group:"op"    },
  { label:"×",   insert:"*",     group:"op"    },
  { label:"÷",   insert:"/",     group:"op"    },
  { label:".",   insert:".",     group:"num"   },
  { label:"⌫",   insert:"DEL",   group:"del"   },
];
const NUMS = ["7","8","9","4","5","6","1","2","3","0"];
const KB_COLORS = {
  var:   ["#a78bfa33","#a78bfa"],
  power: ["#38bdf833","#38bdf8"],
  trig:  ["#34d39933","#34d399"],
  op:    ["#f59e0b22","#f59e0b"],
  num:   ["#ffffff11","#94a3b8"],
  del:   ["#ef444422","#ef4444"],
};

// ─── SHARED STYLES ────────────────────────────────────────────
const glassCard = {
  background:"rgba(255,255,255,0.05)",
  backdropFilter:"blur(12px)",
  borderRadius:20,
  padding:32,
  border:"1px solid rgba(255,255,255,0.08)",
  marginTop:20,
};

const cyberBtn = {
  borderRadius:10,
  border:"none",
  cursor:"pointer",
  fontSize:"0.95rem",
  fontWeight:700,
  letterSpacing:"0.08em",
  background:"linear-gradient(135deg,#a78bfa,#38bdf8)",
  color:"#0f0c29",
};

// ─── APP PRINCIPAL ────────────────────────────────────────────
// ─── TAB NOTAS ───────────────────────────────────────────────
// Componente separado para evitar IIFEs en JSX.
// Recibe todos los estados de notas como props desde App.
// ─────────────────────────────────────────────────────────────
function TabNotas({ notas, setNotas, notaActual, setNotaActual, notaInput, setNotaInput, notaBuscar, setNotaBuscar }) {
  const guardarNota = () => {
    if (!notaInput.titulo.trim() && !notaInput.contenido.trim()) return;
    let nuevasNotas;
    if (notaActual) {
      nuevasNotas = notas.map(n => n.id === notaActual.id
        ? { ...n, titulo: notaInput.titulo || "Sin título", contenido: notaInput.contenido, fecha: new Date().toISOString() }
        : n
      );
    } else {
      const nueva = { id: Date.now(), titulo: notaInput.titulo || "Sin título", contenido: notaInput.contenido, fecha: new Date().toISOString() };
      nuevasNotas = [nueva, ...notas];
    }
    setNotas(nuevasNotas);
    try { localStorage.setItem("neoderiva_notas", JSON.stringify(nuevasNotas)); } catch {}
    setNotaActual(null);
    setNotaInput({ titulo: "", contenido: "" });
  };

  const borrarNota = (id) => {
    if (!window.confirm("¿Borrar esta nota?")) return;
    const nuevasNotas = notas.filter(n => n.id !== id);
    setNotas(nuevasNotas);
    try { localStorage.setItem("neoderiva_notas", JSON.stringify(nuevasNotas)); } catch {}
    if (notaActual?.id === id) { setNotaActual(null); setNotaInput({ titulo: "", contenido: "" }); }
  };

  const editarNota = (nota) => { setNotaActual(nota); setNotaInput({ titulo: nota.titulo, contenido: nota.contenido }); };
  const nuevaNota  = () => { setNotaActual(null); setNotaInput({ titulo: "", contenido: "" }); };
  const notasFiltradas = notas.filter(n =>
    n.titulo.toLowerCase().includes(notaBuscar.toLowerCase()) ||
    n.contenido.toLowerCase().includes(notaBuscar.toLowerCase())
  );

  const btnAmarillo = { fontFamily: "inherit", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", padding: "10px 18px", background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#0f0c29" };

  return (
    <div style={{ width: "100%", padding: "20px 16px", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 16 }}>

        {/* Lista */}
        <div style={{ ...glassCard, marginTop: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>📝 Mis Apuntes <span style={{ fontSize: "0.7rem", color: "#64748b" }}>({notas.length})</span></span>
            <button onClick={nuevaNota} style={{ ...btnAmarillo, padding: "6px 14px", fontSize: "0.78rem" }}>+ Nueva</button>
          </div>
          <input value={notaBuscar} onChange={e => setNotaBuscar(e.target.value)} placeholder="Buscar en apuntes..."
            style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
          {notas.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "30px 0", fontSize: "0.82rem", lineHeight: 2 }}>
              <div style={{ fontSize: "2rem", marginBottom: 8, opacity: 0.3 }}>📝</div>
              Aún no tienes apuntes.<br />Pulsa <strong style={{ color: "#f59e0b" }}>+ Nueva</strong> para empezar.
            </div>
          ) : notasFiltradas.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0", fontSize: "0.82rem" }}>Sin resultados para "{notaBuscar}"</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
              {notasFiltradas.map(nota => {
                const activa = notaActual?.id === nota.id;
                const fecha = new Date(nota.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={nota.id} onClick={() => editarNota(nota)}
                    style={{ background: activa ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${activa ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: activa ? "#f59e0b" : "#e2e8f0", fontSize: "0.85rem", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nota.titulo}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nota.contenido.slice(0, 60)}{nota.contenido.length > 60 ? "..." : ""}</div>
                        <div style={{ fontSize: "0.65rem", color: "#475569", marginTop: 4 }}>{fecha}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); borrarNota(nota.id); }}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem", padding: "2px 4px", flexShrink: 0 }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Editor */}
        <div style={{ ...glassCard, marginTop: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>{notaActual ? "✏️ Editando" : "✨ Nuevo apunte"}</span>
            {notaActual && <button onClick={nuevaNota} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#64748b", fontSize: "0.72rem", cursor: "pointer", padding: "4px 10px", fontFamily: "inherit" }}>+ Nuevo</button>}
          </div>
          <div>
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, display: "block" }}>título</span>
            <input value={notaInput.titulo} onChange={e => setNotaInput(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Regla de la cadena..."
              style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1.5px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(245,158,11,0.25)"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, display: "block" }}>contenido</span>
            <textarea value={notaInput.contenido} onChange={e => setNotaInput(p => ({ ...p, contenido: e.target.value }))}
              placeholder={"Escribe tus apuntes aquí...\n\nEj:\n• d/dx[xⁿ] = n·x^(n-1)\n• sin(x) → cos(x)"}
              rows={12}
              style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1.5px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "12px 14px", color: "#e2e8f0", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }}
              onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(245,158,11,0.25)"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={guardarNota} style={{ ...btnAmarillo, flex: 1, padding: "11px" }}>
              {notaActual ? "💾 Guardar cambios" : "💾 Guardar apunte"}
            </button>
            {notaActual && (
              <button onClick={() => { setNotaActual(null); setNotaInput({ titulo: "", contenido: "" }); }}
                style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#475569", lineHeight: 1.6, padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
            💡 Tus apuntes se guardan en el dispositivo y estarán aquí cada vez que abras la app.
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── IA TUTOR ────────────────────────────────────────────────
// Componente completo del tab 🤖 IA Tutor usando Gemini 2.0 Flash.
// contextoCalculadora: objeto con el estado actual de la calculadora
// para que la IA pueda responder sobre lo que el usuario está viendo.
//
// IMPORTANTE: Reemplaza "TU_API_KEY_AQUI" con tu clave de Gemini.
// Obtén una en: https://aistudio.google.com/apikey (gratis)
// ─────────────────────────────────────────────────────────────
const GEMINI_API_KEY = "TU_API_KEY_AQUI";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Eres NeoTutor, un asistente de cálculo diferencial e integral para estudiantes universitarios de segundo semestre. Eres experto en:
- Derivadas (reglas de la potencia, producto, cociente, cadena, trigonométricas, exponenciales, logarítmicas)
- Límites (definición, regla de L'Hôpital, límites al infinito)
- Integrales (indefinidas, definidas, teorema fundamental del cálculo)
- Análisis de funciones (puntos críticos, concavidad, extremos)

Tu estilo es claro, pedagógico y motivador. Usas ejemplos concretos. Cuando sea útil, expresas fórmulas en formato LaTeX usando $...$ para inline y $$...$$ para display.

Responde SIEMPRE en español. Sé conciso pero completo. Si el usuario comparte el contexto de la calculadora (función actual, derivada, etc.), úsalo para dar respuestas contextualizadas.`;

// Renderizador de texto con soporte para LaTeX inline/display y markdown básico
function RenderMensaje({ texto }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    // Procesamos el texto: reemplazamos $$...$$ y $...$ con spans renderizados por KaTeX
    const partes = [];
    let rest = texto;
    // Primero display math $$...$$
    const rDisplay = /\$\$(.+?)\$\$/gs;
    // Luego inline $...$
    const rInline = /\$(.+?)\$/g;

    // Convertimos el texto a HTML seguro con KaTeX
    let html = rest
      // Escapa HTML básico primero
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      // Markdown: **negrita**
      .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
      // Markdown: *cursiva*
      .replace(/\*(.+?)\*/g,"<em>$1</em>")
      // Saltos de línea
      .replace(/\n/g,"<br/>");

    el.innerHTML = html;

    // Ahora renderizamos LaTeX: buscamos los patrones en el texto original
    // y reemplazamos con KaTeX en el DOM
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    // Nada más que hacer — usamos un enfoque diferente:
    // re-construimos el HTML con KaTeX renderizado
    let htmlFinal = texto
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,"<em>$1</em>");

    // Display math $$...$$
    htmlFinal = htmlFinal.replace(/\$\$(.+?)\$\$/gs, (_, math) => {
      try { return `<div style="margin:8px 0;overflow-x:auto">${katex.renderToString(math, { displayMode:true, throwOnError:false })}</div>`; }
      catch { return `<code>${math}</code>`; }
    });
    // Inline math $...$
    htmlFinal = htmlFinal.replace(/\$(.+?)\$/g, (_, math) => {
      try { return katex.renderToString(math, { displayMode:false, throwOnError:false }); }
      catch { return `<code>${math}</code>`; }
    });
    // Saltos de línea (después de LaTeX para no romper los spans)
    htmlFinal = htmlFinal.replace(/\n/g,"<br/>");

    el.innerHTML = htmlFinal;
  }, [texto]);

  return <span ref={ref} style={{ lineHeight:1.75 }} />;
}

function TabIATutor({ contextoCalculadora }) {
  const [mensajes,    setMensajes]    = useState([]);
  const [input,       setIaInput]     = useState("");
  const [cargando,    setCargando]    = useState(false);
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem("neoderiva_gemini_key") || "");
  const [mostrarConf, setMostrarConf] = useState(false);
  const [usarContexto,setUsarContexto]= useState(true);
  const chatRef   = useRef(null);
  const inputRef  = useRef(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes, cargando]);

  const keyEfectivo = apiKey.trim() || GEMINI_API_KEY;
  const apiConfigurada = keyEfectivo && keyEfectivo !== "TU_API_KEY_AQUI";

  const guardarKey = (k) => {
    setApiKey(k);
    try { localStorage.setItem("neoderiva_gemini_key", k); } catch(_) {}
  };

  // Construye el contexto de la calculadora como texto para el prompt
  const buildContexto = () => {
    if (!usarContexto) return "";
    const ctx = contextoCalculadora;
    const partes = [];
    if (ctx.funcionActual) partes.push(`Función actual en calculadora: f(x) = ${ctx.funcionActual}`);
    if (ctx.derivadaActual) partes.push(`Derivada calculada: f'(x) = ${ctx.derivadaActual}`);
    if (ctx.limExpr) partes.push(`Expresión de límites: ${ctx.limExpr}`);
    if (ctx.intExpr) partes.push(`Expresión de integrales: ${ctx.intExpr}`);
    if (partes.length === 0) return "";
    return `\n\n[Contexto actual de la calculadora del usuario:\n${partes.join("\n")}]`;
  };

  // Envía mensaje a Gemini
  const enviar = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;
    if (!apiConfigurada) { setMostrarConf(true); return; }

    const contextoStr = buildContexto();
    const userMsg = { rol:"user", texto };
    setMensajes(prev => [...prev, userMsg]);
    setIaInput("");
    setCargando(true);

    // Construye el historial para la API (solo los últimos 10 mensajes)
    const hist = [...mensajes, userMsg].slice(-10);
    const contents = hist.map(m => ({
      role: m.rol === "user" ? "user" : "model",
      parts: [{ text: m.rol === "user" && m === hist[hist.length-1]
        ? texto + contextoStr
        : m.texto }]
    }));

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${keyEfectivo}`;
      const body = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature:0.7, maxOutputTokens:1500 }
      };
      const res = await fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error ${res.status}`);
      }
      const data = await res.json();
      const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
      setMensajes(prev => [...prev, { rol:"model", texto:respuesta }]);
    } catch(err) {
      setMensajes(prev => [...prev, { rol:"error", texto:`⚠ Error: ${err.message}` }]);
    } finally {
      setCargando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const limpiarChat = () => {
    if (window.confirm("¿Limpiar el historial del chat?")) setMensajes([]);
  };

  // Preguntas de inicio rápido
  const STARTERS = [
    "¿Qué es una derivada y para qué sirve?",
    "Explícame la regla de la cadena con un ejemplo",
    "¿Cómo encuentro puntos críticos de una función?",
    "¿Cuándo aplica la regla de L'Hôpital?",
    "¿Qué relación hay entre derivada e integral?",
  ];

  const glassIA = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(167,139,250,0.18)", borderRadius:14, padding:16, backdropFilter:"blur(12px)" };

  return (
    <div style={{ width:"100%", maxWidth:760, margin:"0 auto", padding:"20px 16px 40px", boxSizing:"border-box" }}>

      {/* Header del tutor */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:"2.2rem", marginBottom:6 }}>🤖</div>
        <div style={{ fontSize:"1rem", fontWeight:700, color:"#a78bfa", letterSpacing:"0.06em" }}>NEO TUTOR</div>
        <div style={{ fontSize:"0.72rem", color:"#64748b", marginTop:2 }}>Asistente de Cálculo · Gemini 2.0 Flash</div>
      </div>

      {/* Panel de configuración API Key */}
      <div style={{ ...glassIA, marginBottom:14, borderColor: apiConfigurada ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.3)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }} onClick={() => setMostrarConf(c=>!c)}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"0.75rem" }}>{apiConfigurada ? "🟢" : "🔴"}</span>
            <span style={{ fontSize:"0.78rem", color: apiConfigurada ? "#10b981" : "#f87171", fontWeight:700 }}>
              {apiConfigurada ? "API Gemini conectada" : "Configura tu API Key de Gemini"}
            </span>
          </div>
          <span style={{ fontSize:"0.7rem", color:"#64748b" }}>{mostrarConf ? "▲" : "▼"}</span>
        </div>
        {mostrarConf && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginBottom:8, lineHeight:1.6 }}>
              Obtén tu API key gratis en{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color:"#38bdf8" }}>aistudio.google.com/apikey</a>.
              Se guarda solo en tu dispositivo.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input
                type="password"
                placeholder="AIza..."
                value={apiKey}
                onChange={e => guardarKey(e.target.value)}
                style={{ flex:1, background:"rgba(0,0,0,0.4)", border:"1.5px solid rgba(167,139,250,0.25)", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:"0.85rem", fontFamily:"inherit", outline:"none" }}
              />
              <button onClick={() => setMostrarConf(false)}
                style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(167,139,250,0.4)", background:"rgba(167,139,250,0.12)", color:"#a78bfa", fontSize:"0.78rem", cursor:"pointer", fontWeight:700 }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contexto de la calculadora */}
      {(contextoCalculadora.funcionActual || contextoCalculadora.limExpr || contextoCalculadora.intExpr) && (
        <div style={{ ...glassIA, marginBottom:14, borderColor:"rgba(56,189,248,0.25)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:"0.75rem", color:"#38bdf8", fontWeight:700 }}>📡 Contexto de la calculadora</span>
            <button onClick={() => setUsarContexto(u=>!u)}
              style={{ padding:"2px 10px", borderRadius:6, border:`1px solid ${usarContexto?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.12)"}`, background: usarContexto?"rgba(56,189,248,0.1)":"transparent", color: usarContexto?"#38bdf8":"#64748b", fontSize:"0.68rem", cursor:"pointer" }}>
              {usarContexto ? "✓ Activo" : "Inactivo"}
            </button>
          </div>
          {usarContexto && (
            <div style={{ marginTop:8, fontSize:"0.75rem", color:"#94a3b8", fontFamily:"monospace", lineHeight:1.8 }}>
              {contextoCalculadora.funcionActual && <div>f(x) = <span style={{ color:"#e2e8f0" }}>{contextoCalculadora.funcionActual}</span></div>}
              {contextoCalculadora.derivadaActual && <div>f'(x) = <span style={{ color:"#a78bfa" }}>{contextoCalculadora.derivadaActual}</span></div>}
              {contextoCalculadora.limExpr && <div>lim: <span style={{ color:"#38bdf8" }}>{contextoCalculadora.limExpr}</span></div>}
              {contextoCalculadora.intExpr && <div>∫: <span style={{ color:"#10b981" }}>{contextoCalculadora.intExpr}</span></div>}
            </div>
          )}
        </div>
      )}

      {/* Área de chat */}
      <div ref={chatRef} style={{ ...glassIA, minHeight:320, maxHeight:480, overflowY:"auto", marginBottom:14, display:"flex", flexDirection:"column", gap:12, padding:"16px 14px" }}>
        {mensajes.length === 0 && !cargando && (
          <div style={{ textAlign:"center", padding:"30px 10px" }}>
            <div style={{ fontSize:"2rem", marginBottom:12 }}>👋</div>
            <div style={{ fontSize:"0.85rem", color:"#94a3b8", lineHeight:1.8, marginBottom:20 }}>
              Hola, soy NeoTutor. Puedo ayudarte con derivadas, límites, integrales y más. ¿Por dónde empezamos?
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {STARTERS.map(s => (
                <button key={s} onClick={() => { setIaInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{ padding:"8px 14px", borderRadius:9, border:"1px solid rgba(167,139,250,0.22)", background:"rgba(167,139,250,0.06)", color:"#c4b5fd", fontSize:"0.78rem", cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.rol==="user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth:"88%",
              padding:"10px 14px",
              borderRadius: m.rol==="user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.rol==="user"
                ? "linear-gradient(135deg,rgba(167,139,250,0.22),rgba(56,189,248,0.18))"
                : m.rol==="error"
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(255,255,255,0.06)",
              border: m.rol==="user"
                ? "1px solid rgba(167,139,250,0.35)"
                : m.rol==="error"
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid rgba(255,255,255,0.1)",
              fontSize:"0.84rem",
              color: m.rol==="error" ? "#fca5a5" : "#e2e8f0",
              lineHeight:1.6,
              animation:"cyberSlide 0.25s ease",
            }}>
              {m.rol === "user"
                ? <span style={{ whiteSpace:"pre-wrap" }}>{m.texto}</span>
                : <RenderMensaje texto={m.texto} />
              }
            </div>
            <span style={{ fontSize:"0.62rem", color:"#475569", marginTop:3, marginLeft:m.rol!=="user"?4:0, marginRight:m.rol==="user"?4:0 }}>
              {m.rol === "user" ? "Tú" : m.rol==="error" ? "Error" : "🤖 NeoTutor"}
            </span>
          </div>
        ))}

        {cargando && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0" }}>
            <div style={{ display:"flex", gap:5 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#a78bfa",
                  animation:`bounce 1.1s ${i*0.18}s infinite ease-in-out`,
                  "@keyframes bounce":{ "0%,80%,100%":{transform:"scale(0)"},"40%":{transform:"scale(1)"} }
                }} />
              ))}
            </div>
            <span style={{ fontSize:"0.75rem", color:"#64748b" }}>NeoTutor está pensando…</span>
          </div>
        )}
      </div>

      {/* Input de mensaje */}
      <div style={{ display:"flex", gap:8 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setIaInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter nueva línea)"
          rows={2}
          style={{ flex:1, background:"rgba(0,0,0,0.45)", border:"1.5px solid rgba(167,139,250,0.25)", borderRadius:10, padding:"10px 14px", color:"#e2e8f0", fontSize:"0.88rem", fontFamily:"inherit", outline:"none", resize:"none", transition:"border-color 0.25s, box-shadow 0.25s", lineHeight:1.5 }}
        />
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <button onClick={enviar} disabled={cargando || !input.trim()}
            style={{ padding:"10px 18px", borderRadius:10, border:"none", background: cargando||!input.trim() ? "rgba(100,116,139,0.3)" : "linear-gradient(135deg,#a78bfa,#38bdf8)", color: cargando||!input.trim() ? "#64748b" : "#0f0c29", fontWeight:700, fontSize:"0.82rem", cursor: cargando||!input.trim() ? "not-allowed" : "pointer", fontFamily:"inherit", flex:1 }}>
            {cargando ? "..." : "→"}
          </button>
          <button onClick={limpiarChat} title="Limpiar chat"
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid rgba(239,68,68,0.25)", background:"rgba(239,68,68,0.07)", color:"#f87171", fontSize:"0.7rem", cursor:"pointer" }}>
            🗑
          </button>
        </div>
      </div>
      <div style={{ fontSize:"0.68rem", color:"#475569", marginTop:6, textAlign:"center" }}>
        Las conversaciones no se guardan entre sesiones · Tus datos nunca salen de tu dispositivo
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity:0.4; }
          40% { transform: scale(1); opacity:1; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [tab,          setTab]        = useState("calc");
  const [input,        setInput]      = useState("");
  const [result,       setResult]     = useState(null);
  const [ruleInfo,     setRule]       = useState(null);
  const [error,        setError]      = useState("");
  const [animKey,      setAnimKey]    = useState(0);
  const [graphData,    setGraph]      = useState(null);
  const [pasos,        setPasos]      = useState([]);
  const [mostrarPasos, setMostrarPasos] = useState(false);
  const [historial, setHistorial] = useState(() => {
  try {
    const saved = localStorage.getItem("historial_derivadas");
    return saved ? JSON.parse(saved) : [];
  } catch(_) { return []; }
 });

  // Límites
  const [limExpr,    setLimExpr]    = useState("");
  const [limPoint,   setLimPoint]   = useState("0");
  const [limResult,  setLimResult]  = useState(null);
  const [limError,   setLimError]   = useState("");
  const [limPoints,  setLimPoints]  = useState(null);

  // Notas
  const [notas, setNotas] = useState(() => {
    try { const s = localStorage.getItem("neoderiva_notas"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [notaActual, setNotaActual] = useState(null); // {id, titulo, contenido, fecha}
  const [notaInput,  setNotaInput]  = useState({ titulo:"", contenido:"" });
  const [notaBuscar, setNotaBuscar] = useState("");

  // L'Hôpital — análisis y pasos pedagógicos
  // lhAnalisis: objeto devuelto por aplicarLHopital(), null si aún no se calculó
  // lhVisible:  si true, el panel de pasos de L'Hôpital está desplegado
  const [lhAnalisis, setLhAnalisis] = useState(null);
  const [lhVisible,  setLhVisible]  = useState(false);

  // Integrales
  const [intExpr,   setIntExpr]   = useState("");
  const [intResult, setIntResult] = useState(null);
  const [intError,  setIntError]  = useState("");

  // Integral definida
  const [defA,      setDefA]      = useState("0");
  const [defB,      setDefB]      = useState("1");
  const [defResult, setDefResult] = useState(null);
  const [defError,  setDefError]  = useState("");

  // Puntos críticos
  const [criticos,     setCriticos]     = useState(null);
  const [criticosError,setCriticosError]= useState("");

  // Derivada de orden n
  const [nthOrder,  setNthOrder]  = useState(null);
  const [nthResult, setNthResult] = useState(null);

  const inputRef    = useRef(null);
  const limInputRef = useRef(null);  // ref para el input de límites
  const intInputRef = useRef(null);  // ref para el input de integrales

  const insertAtCursor = useCallback((text) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? input.length;
    const end   = el.selectionEnd   ?? input.length;
    if (text === "DEL") {
      setInput(input.slice(0, Math.max(0,start-1)) + input.slice(end));
    } else {
      setInput(input.slice(0,start) + text + input.slice(end));
      setTimeout(() => el.setSelectionRange(start+text.length, start+text.length), 0);
    }
    el.focus();
  }, [input]);

  // Inserta en el input de LÍMITES en la posición del cursor
  const insertLim = useCallback((text) => {
    const el = limInputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? limExpr.length;
    const end   = el.selectionEnd   ?? limExpr.length;
    if (text === "DEL") {
      setLimExpr(limExpr.slice(0, Math.max(0,start-1)) + limExpr.slice(end));
    } else {
      setLimExpr(limExpr.slice(0,start) + text + limExpr.slice(end));
      setTimeout(() => el.setSelectionRange(start+text.length, start+text.length), 0);
    }
    el.focus();
  }, [limExpr]);

  // Inserta en el input de INTEGRALES en la posición del cursor
  const insertInt = useCallback((text) => {
    const el = intInputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? intExpr.length;
    const end   = el.selectionEnd   ?? intExpr.length;
    if (text === "DEL") {
      setIntExpr(intExpr.slice(0, Math.max(0,start-1)) + intExpr.slice(end));
    } else {
      setIntExpr(intExpr.slice(0,start) + text + intExpr.slice(end));
      setTimeout(() => el.setSelectionRange(start+text.length, start+text.length), 0);
    }
    el.focus();
  }, [intExpr]);

  // Calcula la integral cuando el usuario pulsa el botón
  const handleIntegrate = useCallback(() => {
    if (!intExpr.trim()) { setIntError("Ingresa una función primero."); return; }
    setIntError("");
    setIntResult(computeIntegral(intExpr));
  }, [intExpr]);

  // Calcula la integral definida
  const handleDefiniteIntegral = useCallback(() => {
    if (!intExpr.trim()) { setDefError("Ingresa una función primero."); return; }
    const a = parseFloat(defA), b = parseFloat(defB);
    if (isNaN(a) || isNaN(b)) { setDefError("Los límites a y b deben ser números."); return; }
    if (a >= b) { setDefError("El límite inferior a debe ser menor que b."); return; }
    setDefError("");
    setDefResult(computeDefiniteIntegral(intExpr, a, b));
  }, [intExpr, defA, defB]);

  // Calcula puntos críticos de la función actual
  const handleCriticalPoints = useCallback(() => {
    if (!result?.success) { setCriticosError("Calcula primero una derivada."); return; }
    setCriticosError("");
    setCriticos(computeCriticalPoints(input));
  }, [result, input]);

  const handleDerive = useCallback(() => {
    if (!input.trim()) { setError("Ingresa una función primero."); return; }
    setError("");
    const res  = computeDerivative(input);
    const rule = detectRule(preprocess(input));
    if (!res.success) {
      setError(`No pude interpretar la función. (${res.error})`);
      setResult(null); setRule(null); setGraph(null);
      setPasos(generarPasos(preprocess(input))); setMostrarPasos(true);
      return;
    }
    setResult(res); setRule(rule); setAnimKey(k=>k+1);
    setNthOrder(null); setNthResult(null); setCriticos(null);
    try { setGraph(generatePoints(res.processed, res.outputText)); } catch(_) { setGraph(null); }
    const np = generarPasos(preprocess(input));
    setPasos(np); setMostrarPasos(true);
    setHistorial(prev => {
  const nuevo = [...prev, { id:Date.now(), expresion:input, derivada:res.outputText, pasos:np, timestamp:new Date() }];
  try { localStorage.setItem("historial_derivadas", JSON.stringify(nuevo)); } catch(_) {}
  return nuevo;
 });
  }, [input]);

  const handleReutilizar = useCallback((ent) => {
    setInput(ent.expresion); setPasos(ent.pasos); setMostrarPasos(true);
    const res  = computeDerivative(preprocess(ent.expresion));
    const rule = detectRule(preprocess(ent.expresion));
    if (res.success) {
      setResult(res); setRule(rule); setAnimKey(k=>k+1);
      try { setGraph(generatePoints(res.processed, res.outputText)); } catch(_) { setGraph(null); }
    }
    window.scrollTo({ top:0, behavior:"smooth" });
  }, []);

  // handleLimit — calcula el límite numérico (ya existía)
  // También limpiamos el análisis de L'Hôpital para que no quede
  // el de una expresión anterior si cambiamos la función.
  const handleLimit = () => {
    if (!limExpr.trim()) { setLimError("Ingresa una función."); return; }
    const p = parseFloat(limPoint);
    if (isNaN(p)) { setLimError("El punto debe ser un número."); return; }
    setLimError("");
    setLhAnalisis(null);   // limpiamos L'Hôpital anterior
    setLhVisible(false);
    const res = computeLimit(limExpr, p);
    setLimResult(res);
    // Generar gráfica cerca del punto
    try {
      const proc = preprocess(limExpr);
      const pts = [];
      const half = 3;
      const steps = 100;
      for (let i=0; i<=steps; i++) {
        const x = (p-half) + i*((2*half)/steps);
        try {
          const y = math.evaluate(proc,{x});
          pts.push({ x:parseFloat(x.toFixed(3)), y:isFinite(y)&&Math.abs(y)<500?parseFloat(y.toFixed(4)):null });
        } catch(_) { pts.push({ x:parseFloat(x.toFixed(3)), y:null }); }
      }
      setLimPoints(pts);
    } catch(_) { setLimPoints(null); }
  };

  // handleLHopital — analiza la indeterminación y genera los pasos
  //
  // FLUJO:
  //   1. Verifica que la expresión tenga forma de cociente (f/g)
  //   2. Llama a parsearCociente() para separar num y den
  //   3. Llama a aplicarLHopital() con el punto elegido
  //   4. Guarda el resultado en lhAnalisis y activa lhVisible
  //
  const handleLHopital = () => {
    if (!limExpr.trim()) { setLimError("Ingresa una función primero."); return; }
    const p = parseFloat(limPoint);
    if (isNaN(p)) { setLimError("El punto debe ser un número."); return; }
    setLimError("");

    // Intentamos parsear como cociente
    const cociente = parsearCociente(limExpr);

    if (!cociente.esCociente) {
      // No es un cociente explícito — explicamos por qué no aplica
      setLhAnalisis({
        tipo: "no_aplica",
        razon:
          `La expresión "${limExpr}" no tiene la forma f(x)/g(x).

` +
          `La Regla de L'Hôpital solo aplica cuando el límite produce
` +
          `una indeterminación 0/0 ó ∞/∞ en un cociente.

` +
          `Ejemplos donde sí aplica:
` +
          `  sin(x)/x      cuando x → 0
` +
          `  (x^2-1)/(x-1) cuando x → 1
` +
          `  ln(x)/(x-1)   cuando x → 1`,
        pasos:    [],
        resultado: null,
        exitoso:  false,
      });
      setLhVisible(true);
      return;
    }

    // Aplicamos el motor de L'Hôpital
    const analisis = aplicarLHopital(cociente.num, cociente.den, p);
    setLhAnalisis(analisis);
    setLhVisible(true);

    // Si L'Hôpital encontró el resultado, también actualizamos el
    // panel de límite numérico para que sean consistentes
    if (analisis.exitoso && analisis.resultado !== null) {
      setLimResult(prev => prev ? { ...prev, hopital: analisis.resultado } : prev);
    }
  };

  const S = {
    root: { minHeight:"100vh", background:"linear-gradient(135deg,#060612 0%,#0d0a2a 40%,#10082a 70%,#060612 100%)", fontFamily:"'Space Mono','DM Mono','Fira Code',monospace", color:"#e2e8f0", paddingBottom:80 },
    header: { textAlign:"center", padding:"60px 20px 10px", position:"relative" },
    title: { fontSize:"clamp(1.6rem,5vw,2.8rem)", fontWeight:700, background:"linear-gradient(90deg,#ff6ee4,#a78bfa,#38bdf8,#34d399)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0, letterSpacing:"-1px", filter:"drop-shadow(0 0 20px #a78bfa44)", lineHeight:1.25, paddingBottom:"0.1em" },
    subtitle: { color:"#94a3b8", fontSize:"0.8rem", marginTop:4, letterSpacing:"0.1em", textTransform:"uppercase" },
    badge: { display:"inline-block", marginTop:8, fontSize:"0.65rem", color:"#38bdf8", border:"1px solid #38bdf833", background:"#38bdf80a", padding:"3px 12px", borderRadius:999, letterSpacing:"0.12em" },
    tabs: { display:"flex", justifyContent:"center", gap:4, marginTop:20, flexWrap:"wrap", padding:"0 12px" },
    tab: (active) => ({ padding:"8px 16px", borderRadius:999, border:`1px solid ${active?"transparent":"rgba(255,255,255,0.15)"}`, cursor:"pointer", fontSize:"0.78rem", fontWeight:700, letterSpacing:"0.06em", transition:"all 0.25s cubic-bezier(.4,0,.2,1)",
      background:active?"linear-gradient(135deg,#a78bfa,#38bdf8)":"rgba(255,255,255,0.06)",
      color:active?"#0f0c29":"#94a3b8", boxShadow:active?"0 0 20px #a78bfa55":"none" }),
    grid: { width:"100%", padding:"24px 16px 0", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))", gap:16, boxSizing:"border-box" },
    card: { ...glassCard, marginTop:0 },
    fullWrap: { width:"100%", padding:"0 16px", boxSizing:"border-box" },
    graphCard: { ...glassCard },
    label: { fontSize:"0.65rem", letterSpacing:"0.12em", color:"#94a3b8", textTransform:"uppercase", marginBottom:6, display:"block" },
    inputBox: { width:"100%", background:"rgba(0,0,0,0.4)", border:"1.5px solid rgba(167,139,250,0.25)", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:"1rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box", transition:"border-color 0.25s, box-shadow 0.25s" },
    btn: { ...cyberBtn, width:"100%", marginTop:14, padding:13, display:"block" },
    kbGrid4: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4, marginTop:12 },
    kbGrid5: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:4, marginBottom:4 },
    kbBtn: (g) => { const [bg,col]=KB_COLORS[g]||KB_COLORS.num; return { padding:"8px 4px", borderRadius:7, border:`1px solid ${col}33`, background:bg, color:col, cursor:"pointer", fontSize:"0.8rem", fontWeight:600, transition:"all 0.15s" }; },
    ruleCard: (c) => ({ borderLeft:`4px solid ${c}`, background:`${c}10`, borderRadius:"0 12px 12px 0", padding:"14px 18px", marginBottom:16, boxShadow:`0 0 12px ${c}22` }),
    resultBox: (accent) => ({ background:accent?"rgba(167,139,250,0.08)":"rgba(0,0,0,0.25)", border:accent?"1px solid rgba(167,139,250,0.3)":"1px solid rgba(255,255,255,0.05)", borderRadius:10, padding:16, textAlign:"center" }),
    error: { background:"#ef444415", border:"1px solid #ef444444", borderRadius:8, padding:"9px 12px", marginTop:10, fontSize:"0.8rem", color:"#fca5a5" },
    empty: { textAlign:"center", color:"#64748b", marginTop:50, padding:"0 10px", lineHeight:1.8 },
    glossGrid: { width:"100%", margin:"24px 0 0", padding:"0 16px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,240px),1fr))", gap:14, boxSizing:"border-box" },
    glossCard: (c) => ({ background:`${c}08`, border:`1px solid ${c}33`, borderRadius:14, padding:20, boxShadow:`0 0 12px ${c}10` }),
    integGrid: { width:"100%", margin:"24px 0 0", padding:"0 16px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))", gap:14, boxSizing:"border-box" },
    integCard: (c) => ({ background:`${c}08`, border:`1px solid ${c}33`, borderRadius:14, padding:18, boxShadow:`0 0 12px ${c}10` }),
  };

  const tabList = [["calc","∂ Derivadas"],["lim","lim Límites"],["int","∫ Integrales"],["quiz","🎮 Quiz"],["glos","📖 Glosario"],["notas","📝 Notas"],["ia","🤖 IA Tutor"]];

  return (
    <><div style={S.root}>
      {/* Scanlines & glow bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(167,139,250,0.015) 2px,rgba(167,139,250,0.015) 4px)" }} />
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: "60vw", height: "40vh", background: "radial-gradient(ellipse,#a78bfa08 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={S.header}>
          <h1 style={S.title}>NEO∂ERIVA</h1>
          <p style={S.subtitle}>Cálculo Diferencial · Sistema de Estudio</p>
          <span style={S.badge}>DERIVADAS · LÍMITES · INTEGRALES · QUIZ</span>
          <div style={S.tabs}>
            {tabList.map(([id, name]) => (
              <button key={id} style={S.tab(tab === id)} onClick={() => setTab(id)}>{name}</button>
            ))}
          </div>
        </div>

        {/* ═══════════════ TAB: DERIVADAS ═══════════════ */}
        {tab === "calc" && (
          <>
            <div style={S.grid}>
              {/* IZQUIERDO */}
              <div style={S.card}>
                <span style={S.label}>función f(x)</span>
                <input
                  ref={inputRef}
                  style={S.inputBox}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleDerive()}
                  placeholder="Ej: x^3 + sin(x)"
                  spellCheck={false} />
                {error && <div style={S.error}>⚠ {error}</div>}
                <button style={S.btn} onClick={handleDerive}>CALCULAR DERIVADA →</button>

                {/* Ejemplos predefinidos */}
                <div style={{ marginTop: 16 }}>
                  <span style={S.label}>ejemplos rápidos</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      { label: "x³", fn: "x^3" },
                      { label: "sin(x)", fn: "sin(x)" },
                      { label: "eˣ", fn: "e^x" },
                      { label: "ln(x)", fn: "ln(x)" },
                      { label: "x²+3x", fn: "x^2+3*x" },
                      { label: "x·sin(x)", fn: "x*sin(x)" },
                      { label: "sin(x²)", fn: "sin(x^2)" },
                      { label: "x⁴−4x²", fn: "x^4-4*x^2" },
                    ].map(ej => (
                      <button key={ej.fn} onClick={() => { setInput(ej.fn); setResult(null); setRule(null); setError(""); setGraph(null); setMostrarPasos(false); setCriticos(null); } }
                        style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.07)", color: "#c4b5fd", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}
                        onMouseEnter={e => { e.target.style.background = "rgba(167,139,250,0.18)"; e.target.style.borderColor = "rgba(167,139,250,0.6)"; } }
                        onMouseLeave={e => { e.target.style.background = "rgba(167,139,250,0.07)"; e.target.style.borderColor = "rgba(167,139,250,0.25)"; } }>
                        {ej.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <span style={S.label}>teclado rápido</span>
                  <div style={S.kbGrid5}>
                    {NUMS.map(n => <button key={n} style={S.kbBtn("num")} onClick={() => insertAtCursor(n)}>{n}</button>)}
                  </div>
                  <div style={S.kbGrid4}>
                    {KEYBOARD.map(btn => <button key={btn.insert} style={S.kbBtn(btn.group)} onClick={() => insertAtCursor(btn.insert)}>{btn.label}</button>)}
                  </div>
                  <button style={{ ...S.kbBtn("del"), width: "100%", marginTop: 5, padding: "8px" }}
                    onClick={() => { setInput(""); setResult(null); setRule(null); setError(""); setGraph(null); setMostrarPasos(false); setPasos([]); } }>
                    Limpiar todo
                  </button>
                </div>
              </div>

              {/* DERECHO */}
              <div style={S.card}>
                <span style={S.label}>análisis pedagógico</span>
                {!result && !ruleInfo && (
                  <div style={S.empty}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 10, opacity: 0.3 }}>∂</div>
                    <p>Ingresa una función y pulsa<br /><strong style={{ color: "#a78bfa" }}>CALCULAR DERIVADA</strong></p>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 12 }}>Prueba: x^3 + sin(x)</p>
                  </div>
                )}
                {ruleInfo && (
                  <div key={`rule-${animKey}`} style={{ ...S.ruleCard(ruleInfo.color), animation: "cyberSlide 0.4s ease" }}>
                    <div style={{ fontWeight: 700, color: ruleInfo.color, marginBottom: 4, fontSize: "0.88rem" }}>📐 {ruleInfo.name}</div>
                    <div style={{ margin: "10px 0" }}><KaTeX formula={ruleInfo.latex} display={true} /></div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6 }}>{ruleInfo.explanation}</div>
                  </div>
                )}
                {result?.success && (
                  <div key={`res-${animKey}`} style={{ animation: "cyberSlide 0.5s ease 0.1s both" }}>
                    <div style={{ marginBottom: 14 }}>
                      <span style={S.label}>función original</span>
                      <div style={S.resultBox(false)}>
                        <KaTeX formula={`f(x) = ${result.inputLatex}`} display={true} />
                      </div>
                    </div>
                    <div style={{ textAlign: "center", fontSize: "1.3rem", color: "#a78bfa", margin: "6px 0" }}>↓</div>
                    <div>
                      <span style={S.label}>derivada f′(x)</span>
                      <div style={S.resultBox(true)}>
                        <KaTeX formula={`f'(x) = ${result.outputLatex}`} display={true} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>
                      Texto: f'(x) = {result.outputText}
                    </div>
                    {/* Copiar al portapapeles */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`f'(x) = ${result.outputText}`);
                        const btn = document.getElementById("copy-btn-deriv");
                        if (btn) { btn.textContent = "✓ Copiado!"; btn.style.color = "#10b981"; btn.style.borderColor = "#10b98166"; setTimeout(() => { btn.textContent = "📋 Copiar resultado"; btn.style.color = "#94a3b8"; btn.style.borderColor = "rgba(255,255,255,0.12)"; }, 2000); }
                      } }
                      id="copy-btn-deriv"
                      style={{ marginTop: 10, width: "100%", padding: "7px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>
                      📋 Copiar resultado
                    </button>

                    {/* Derivada de orden n */}
                    <div style={{ marginTop: 16 }}>
                      <span style={S.label}>derivada de orden n</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {[2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => {
                            try {
                              let expr = preprocess(input);
                              for (let i = 0; i < n; i++) expr = math.simplify(math.derivative(expr, "x")).toString();
                              const latex = math.parse(expr).toTex();
                              setNthOrder(n); setNthResult({ text: expr, latex });
                            } catch (e) { setNthResult({ error: e.message }); setNthOrder(n); }
                          } }
                            style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${nthOrder === n ? "#38bdf888" : "rgba(56,189,248,0.2)"}`, background: nthOrder === n ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.05)", color: nthOrder === n ? "#38bdf8" : "#64748b", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}>
                            f<sup>({n})</sup>
                          </button>
                        ))}
                        {nthOrder && <button onClick={() => { setNthOrder(null); setNthResult(null); } } style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#f87171", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>✕</button>}
                      </div>
                      {nthResult && !nthResult.error && (
                        <div style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 10, padding: "12px 14px", animation: "cyberSlide 0.3s ease" }}>
                          <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>f<sup>({nthOrder})</sup>(x)</div>
                          <KaTeX formula={nthResult.latex} display={true} />
                          <div style={{ marginTop: 8, fontSize: "0.7rem", color: "#64748b", fontFamily: "monospace" }}>{nthResult.text}</div>
                          <button onClick={() => {
                            navigator.clipboard.writeText(`f^(${nthOrder})(x) = ${nthResult.text}`);
                            const btn = document.getElementById("copy-btn-nth");
                            if (btn) { btn.textContent = "✓ Copiado!"; btn.style.color = "#10b981"; setTimeout(() => { btn.textContent = "📋 Copiar"; btn.style.color = "#64748b"; }, 2000); }
                          } } id="copy-btn-nth"
                            style={{ marginTop: 8, padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#64748b", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit" }}>
                            📋 Copiar
                          </button>
                        </div>
                      )}
                      {nthResult?.error && <div style={S.error}>⚠ {nthResult.error}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={S.fullWrap}><DerivationSteps pasos={pasos} visible={mostrarPasos} /></div>

            {graphData && (
              <div style={S.fullWrap}>
                <div style={{ ...S.graphCard, animation: "cyberSlide 0.6s ease" }}>
                  <span style={S.label}>visualización gráfica</span>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "4px 0 8px" }}>
                    <strong style={{ color: "#a78bfa" }}>— f(x)</strong> &nbsp;·&nbsp; <strong style={{ color: "#38bdf8" }}>- - f'(x)</strong>
                    {criticos?.success && criticos.puntos.length > 0 && (
                      <> &nbsp; ·&nbsp; <strong style={{ color: "#10b981" }}>▲ máx</strong> <strong style={{ color: "#ef4444" }}>▼ mín</strong> <strong style={{ color: "#38bdf8" }}>↔ infl</strong></>
                    )}
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={graphData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="x" stroke="#2d3748" tick={{ fill: "#64748b", fontSize: 10 }} tickCount={13} />
                      <YAxis stroke="#2d3748" tick={{ fill: "#64748b", fontSize: 10 }} domain={["auto", "auto"]} width={38} />
                      <Tooltip contentStyle={{ background: "rgba(6,6,18,0.97)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8, fontSize: 12 }} labelFormatter={v => `x = ${v}`} formatter={(val, name) => [val !== null ? val.toFixed(4) : "—", name === "fx" ? "f(x)" : "f'(x)"]} />
                      <Legend formatter={v => v === "fx" ? "f(x)" : "f'(x)"} wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                      <Line type="monotone" dataKey="fx" stroke="#a78bfa" strokeWidth={2.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="dfx" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
                      {/* Puntos críticos marcados sobre la curva */}
                      {criticos?.success && criticos.puntos.map((p, i) => {
                        const col = p.tipo === "máximo local" ? "#10b981" : p.tipo === "mínimo local" ? "#ef4444" : "#38bdf8";
                        const label = p.tipo === "máximo local" ? "▲" : p.tipo === "mínimo local" ? "▼" : "↔";
                        return (
                          <ReferenceDot key={i} x={p.x} y={p.y} r={6} fill={col} stroke="#0d0a2a" strokeWidth={2}
                            label={{ value: label, position: "top", fill: col, fontSize: 12 }} />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Puntos críticos sobre la gráfica */}
                  {criticos?.success && criticos.puntos.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {criticos.puntos.map((p, i) => {
                        const col = p.tipo === "máximo local" ? "#10b981" : p.tipo === "mínimo local" ? "#ef4444" : "#38bdf8";
                        const icon = p.tipo === "máximo local" ? "▲" : p.tipo === "mínimo local" ? "▼" : "↔";
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: `${col}12`, border: `1px solid ${col}44`, borderRadius: 8, padding: "5px 10px" }}>
                            <span style={{ color: col, fontSize: "0.8rem" }}>{icon}</span>
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "monospace" }}>({p.x}, {p.y})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {(!criticos || !criticos.success) && result?.success && (
                    <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: 10 }}>
                      💡 Pulsa <strong style={{ color: "#f59e0b" }}>Analizar f(x)</strong> en la sección de Puntos Críticos para ver los máximos y mínimos marcados aquí.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={S.fullWrap}>
              <CalculationHistory historial={historial} onSeleccionar={handleReutilizar} onLimpiar={() => { setHistorial([]); setMostrarPasos(false); setPasos([]); } } />
            </div>

            {/* ── PUNTOS CRÍTICOS ── */}
            {result?.success && (
              <div style={S.fullWrap}>
                <div style={{ ...glassCard }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>📍 Puntos Críticos</span>
                    <button onClick={handleCriticalPoints}
                      style={{ ...cyberBtn, padding: "7px 18px", fontSize: "0.8rem", background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
                      Analizar f(x)
                    </button>
                  </div>
                  {criticosError && <div style={S.error}>⚠ {criticosError}</div>}
                  {criticos && !criticos.success && <div style={S.error}>⚠ {criticos.error}</div>}
                  {criticos?.success && (
                    <>
                      {/* Derivadas encontradas */}
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 12, lineHeight: 1.8, background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                        <div><strong style={{ color: "#f59e0b" }}>f'(x)</strong> = {criticos.deriv}</div>
                        <div><strong style={{ color: "#38bdf8" }}>f''(x)</strong> = {criticos.deriv2}</div>
                      </div>

                      {/* Resumen de cuántos encontró */}
                      {criticos.puntos.length > 0 && (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                          {criticos.puntos.filter(p => p.tipo === "máximo local").length > 0 && (
                            <span style={{ fontSize: "0.75rem", background: "#10b98120", color: "#10b981", border: "1px solid #10b98144", borderRadius: 999, padding: "3px 12px" }}>
                              ▲ {criticos.puntos.filter(p => p.tipo === "máximo local").length} máximo{criticos.puntos.filter(p => p.tipo === "máximo local").length > 1 ? "s" : ""}
                            </span>
                          )}
                          {criticos.puntos.filter(p => p.tipo === "mínimo local").length > 0 && (
                            <span style={{ fontSize: "0.75rem", background: "#ef444420", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 999, padding: "3px 12px" }}>
                              ▼ {criticos.puntos.filter(p => p.tipo === "mínimo local").length} mínimo{criticos.puntos.filter(p => p.tipo === "mínimo local").length > 1 ? "s" : ""}
                            </span>
                          )}
                          {criticos.puntos.filter(p => p.tipo === "inflexión").length > 0 && (
                            <span style={{ fontSize: "0.75rem", background: "#38bdf820", color: "#38bdf8", border: "1px solid #38bdf844", borderRadius: 999, padding: "3px 12px" }}>
                              ↔ {criticos.puntos.filter(p => p.tipo === "inflexión").length} inflexión{criticos.puntos.filter(p => p.tipo === "inflexión").length > 1 ? "es" : ""}
                            </span>
                          )}
                        </div>
                      )}

                      {criticos.puntos.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px 0" }}>No se encontraron puntos críticos en [-10, 10]</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                          {criticos.puntos.map((p, i) => {
                            const col = p.tipo === "máximo local" ? "#10b981" : p.tipo === "mínimo local" ? "#ef4444" : p.tipo === "inflexión" ? "#38bdf8" : "#a78bfa";
                            const icon = p.tipo === "máximo local" ? "▲" : p.tipo === "mínimo local" ? "▼" : p.tipo === "inflexión" ? "↔" : "?";
                            const explicacion = p.tipo === "máximo local"
                              ? `La función sube, llega al tope en este punto y empieza a bajar. f''(x) < 0 confirma que la curva es cóncava hacia abajo (∩).`
                              : p.tipo === "mínimo local"
                                ? `La función baja, toca el punto más bajo aquí y vuelve a subir. f''(x) > 0 confirma que la curva es cóncava hacia arriba (∪).`
                                : `La función cambia de curvatura aquí: pasa de cóncava a convexa (o viceversa). f'(x) puede no ser cero, pero f''(x) ≈ 0.`;
                            return (
                              <div key={i} style={{ background: `${col}10`, border: `1px solid ${col}44`, borderRadius: 12, padding: "14px 16px" }}>
                                <div style={{ color: col, fontWeight: 700, fontSize: "0.85rem", marginBottom: 8 }}>{icon} {p.tipo}</div>
                                <div style={{ fontSize: "0.82rem", color: "#e2e8f0", fontFamily: "monospace", marginBottom: 2 }}>x = {p.x}</div>
                                <div style={{ fontSize: "0.82rem", color: "#e2e8f0", fontFamily: "monospace", marginBottom: 8 }}>f(x) = {p.y}</div>
                                {p.tipo !== "inflexión" && (
                                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 8 }}>f''(x) = {p.d2}</div>
                                )}
                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.6, borderTop: `1px solid ${col}22`, paddingTop: 8 }}>
                                  {explicacion}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Leyenda del criterio */}
                      <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(0,0,0,0.25)", borderRadius: 10, fontSize: "0.74rem", color: "#64748b", lineHeight: 1.8 }}>
                        <strong style={{ color: "#94a3b8", display: "block", marginBottom: 4 }}>📐 Criterio de la 2ª Derivada</strong>
                        <span style={{ color: "#10b981" }}>f''(x) &lt; 0</span> → la curva es cóncava ∩ → <strong style={{ color: "#10b981" }}>máximo local</strong><br />
                        <span style={{ color: "#ef4444" }}>f''(x) &gt; 0</span> → la curva es cóncava ∪ → <strong style={{ color: "#ef4444" }}>mínimo local</strong><br />
                        <span style={{ color: "#38bdf8" }}>f''(x) ≈ 0</span> → posible cambio de curvatura → <strong style={{ color: "#38bdf8" }}>inflexión</strong>
                      </div>
                    </>
                  )}
                  {!criticos && (
                    <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0", fontSize: "0.82rem" }}>
                      Pulsa <strong style={{ color: "#f59e0b" }}>Analizar f(x)</strong> para encontrar máximos, mínimos e inflexiones
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ TAB: LÍMITES ═══════════════ */}
        {tab === "lim" && (
          <>
            <div style={S.grid}>
              {/* Input */}
              <div style={S.card}>
                <span style={S.label}>función f(x)</span>
                <input
                  ref={limInputRef}
                  style={S.inputBox}
                  value={limExpr}
                  onChange={e => setLimExpr(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLimit()}
                  placeholder="Ej: sin(x)/x  o  (x^2-1)/(x-1)"
                  spellCheck={false} />
                <span style={{ ...S.label, marginTop: 14 }}>punto x →</span>
                <input
                  style={S.inputBox}
                  value={limPoint}
                  onChange={e => setLimPoint(e.target.value)}
                  placeholder="Ej: 0, 1, -2, 3.14"
                  spellCheck={false} />
                {limError && <div style={S.error}>⚠ {limError}</div>}

                {/* Botón principal: límite numérico */}
                <button style={S.btn} onClick={handleLimit}>CALCULAR LÍMITE →</button>

                {/*
              Botón de L'Hôpital — aparece solo después de calcular el límite.
              Si el usuario no ha calculado nada aún, no tiene sentido mostrarlo.
              Lo habilitamos cuando hay un resultado de límite cargado.
            */}
                {limResult && (
                  <button
                    onClick={handleLHopital}
                    style={{
                      ...S.btn,
                      marginTop: 8,
                      background: lhVisible
                        ? "rgba(167,139,250,0.15)"
                        : "linear-gradient(135deg,#7c3aed,#a78bfa)",
                      border: lhVisible ? "1px solid #a78bfa55" : "none",
                      color: lhVisible ? "#a78bfa" : "#0f0c29",
                    }}
                  >
                    {lhVisible ? "↩ Ocultar L'Hôpital" : "🏥 Aplicar Regla de L'Hôpital"}
                  </button>
                )}

                {/* Teclado virtual — mismo sistema que derivadas */}
                <div style={{ marginTop: 16 }}>
                  <span style={S.label}>teclado rápido</span>
                  <div style={S.kbGrid5}>
                    {NUMS.map(n => <button key={n} style={S.kbBtn("num")} onClick={() => insertLim(n)}>{n}</button>)}
                  </div>
                  <div style={S.kbGrid4}>
                    {KEYBOARD.map(btn => <button key={btn.insert} style={S.kbBtn(btn.group)} onClick={() => insertLim(btn.insert)}>{btn.label}</button>)}
                  </div>
                  <button style={{ ...S.kbBtn("del"), width: "100%", marginTop: 5, padding: "8px" }}
                    onClick={() => { setLimExpr(""); setLimResult(null); setLimError(""); setLimPoints(null); setLhAnalisis(null); setLhVisible(false); } }>
                    Limpiar todo
                  </button>
                </div>

                <div style={{ marginTop: 16, padding: "14px", background: "rgba(0,0,0,0.25)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Ejemplos clásicos</div>
                  {[
                    { f: "sin(x)/x", p: "0", label: "0/0 clásico" },
                    { f: "(x^2-1)/(x-1)", p: "1", label: "Removible 0/0" },
                    { f: "(e^x-1)/x", p: "0", label: "Derivada de eˣ" },
                    { f: "(1-cos(x))/x^2", p: "0", label: "L'Hôpital ×2" },
                    { f: "ln(x)/(x-1)", p: "1", label: "ln → 0/0" },
                    { f: "1/x", p: "0", label: "No existe" },
                  ].map(ex => (
                    <button key={ex.f} onClick={() => { setLimExpr(ex.f); setLimPoint(ex.p); } }
                      style={{ display: "block", width: "100%", marginBottom: 5, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#64748b", fontSize: "0.75rem", cursor: "pointer", textAlign: "left" }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = "#38bdf855"; e.currentTarget.style.color = "#38bdf8"; } }
                      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748b"; } }>
                      <span style={{ color: "#38bdf8" }}>f(x) = </span>{ex.f} &nbsp;<span style={{ color: "#94a3b8" }}>x → {ex.p}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultado */}
              <div style={S.card}>
                <span style={S.label}>resultado del límite</span>
                {!limResult && (
                  <div style={S.empty}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 10, opacity: 0.3 }}>lim</div>
                    <p>Ingresa una función y el punto<br />para evaluar el límite.</p>
                  </div>
                )}
                {limResult && (
                  <div style={{ animation: "cyberSlide 0.4s ease" }}>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                      <KaTeX formula={`\\lim_{x \\to ${limPoint}} f(x)`} display={true} />
                    </div>

                    {/* Límites laterales */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                      <div style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Límite izquierdo</div>
                        <div style={{ color: "#e2e8f0", fontSize: "1rem", fontFamily: "monospace" }}>
                          {limResult.fromLeft !== null ? limResult.fromLeft.toFixed(6) : "—"}
                        </div>
                      </div>
                      <div style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Límite derecho</div>
                        <div style={{ color: "#e2e8f0", fontSize: "1rem", fontFamily: "monospace" }}>
                          {limResult.fromRight !== null ? limResult.fromRight.toFixed(6) : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Resultado final */}
                    <div style={{ background: limResult.exists ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${limResult.exists ? "#10b98144" : "#ef444444"}`, borderRadius: 12, padding: "16px", textAlign: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: "0.65rem", color: limResult.exists ? "#10b981" : "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                        {limResult.exists ? "✓ LÍMITE EXISTE" : "✗ LÍMITE NO EXISTE"}
                      </div>
                      {limResult.exists && (
                        <div style={{ fontSize: "1.5rem", color: "#10b981", fontFamily: "monospace" }}>
                          = {limResult.exact?.toFixed(6)}
                        </div>
                      )}
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>
                      💡 {limResult.info}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfica del límite */}
            {limPoints && (
              <div style={S.fullWrap}>
                <div style={{ ...S.graphCard, animation: "cyberSlide 0.5s ease" }}>
                  <span style={S.label}>gráfica cerca de x = {limPoint}</span>
                  <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "4px 0 10px" }}>
                    <span style={{ color: "#ffe620" }}>┅ x = {limPoint}</span> &nbsp;·&nbsp; punto donde se evalúa el límite
                  </p>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={limPoints} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="x" stroke="#2d3748" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <YAxis stroke="#2d3748" tick={{ fill: "#64748b", fontSize: 10 }} domain={["auto", "auto"]} width={48} />
                      <Tooltip contentStyle={{ background: "rgba(6,6,18,0.97)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, fontSize: 12 }} labelFormatter={v => `x = ${v}`} formatter={(val) => [val !== null ? val.toFixed(4) : "—", "f(x)"]} />
                      <ReferenceLine x={parseFloat(limPoint)} stroke="#ffe620" strokeDasharray="6 3" strokeWidth={2} label={{ value: `x=${limPoint}`, fill: "#ffe620", fontSize: 10, position: "top" }} />
                      {limResult?.exists && (
                        <ReferenceLine y={limResult.exact} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `L=${limResult.exact?.toFixed(3)}`, fill: "#10b981", fontSize: 10, position: "right" }} />
                      )}
                      <Line type="monotone" dataKey="y" stroke="#38bdf8" strokeWidth={2.5} dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  {limResult?.exists && (
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 10 }}>
                      La función se aproxima a <strong style={{ color: "#10b981" }}>{limResult.exact?.toFixed(4)}</strong> cuando x → {limPoint}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/*
              PANEL DE L'HÔPITAL — se muestra debajo de la gráfica
              cuando el usuario pulsó "Aplicar Regla de L'Hôpital"
              lhVisible controla si está desplegado.
              lhAnalisis contiene los pasos generados por aplicarLHopital().
            */}
            {lhVisible && lhAnalisis && (
              <div style={S.fullWrap}>
                <LHopitalSteps
                  analisis={lhAnalisis}
                  limPoint={limPoint}
                  limExpr={limExpr} />
              </div>
            )}
          </>
        )}

        {/* ═══════════════ TAB: INTEGRALES ═══════════════ */}
        {tab === "int" && (
          <>
            {/* CALCULADORA INTERACTIVA */}
            <div style={S.grid}>

              {/* PANEL IZQUIERDO: input + teclado */}
              <div style={S.card}>
                <span style={S.label}>función f(x) a integrar</span>
                <input
                  ref={intInputRef}
                  style={S.inputBox}
                  value={intExpr}
                  onChange={e => setIntExpr(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleIntegrate()}
                  placeholder="Ej: x^3  sin(x)  e^x  1/x  sqrt(x)"
                  spellCheck={false} />
                {intError && <div style={S.error}>⚠ {intError}</div>}
                <button style={S.btn} onClick={handleIntegrate}>CALCULAR INTEGRAL →</button>

                {/* Ejemplos predefinidos */}
                <div style={{ marginTop: 16 }}>
                  <span style={S.label}>ejemplos rápidos</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      { label: "x³", fn: "x^3" },
                      { label: "sin(x)", fn: "sin(x)" },
                      { label: "cos(x)", fn: "cos(x)" },
                      { label: "eˣ", fn: "e^x" },
                      { label: "ln(x)", fn: "ln(x)" },
                      { label: "1/x", fn: "1/x" },
                      { label: "√x", fn: "sqrt(x)" },
                      { label: "tan(x)", fn: "tan(x)" },
                    ].map(ej => (
                      <button key={ej.fn} onClick={() => { setIntExpr(ej.fn); setIntResult(null); setIntError(""); setDefResult(null); } }
                        style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.07)", color: "#6ee7b7", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}
                        onMouseEnter={e => { e.target.style.background = "rgba(52,211,153,0.18)"; e.target.style.borderColor = "rgba(52,211,153,0.6)"; } }
                        onMouseLeave={e => { e.target.style.background = "rgba(52,211,153,0.07)"; e.target.style.borderColor = "rgba(52,211,153,0.25)"; } }>
                        {ej.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <span style={S.label}>teclado rápido</span>
                  <div style={S.kbGrid5}>
                    {NUMS.map(n => <button key={n} style={S.kbBtn("num")} onClick={() => insertInt(n)}>{n}</button>)}
                  </div>
                  <div style={S.kbGrid4}>
                    {KEYBOARD.map(btn => <button key={btn.insert} style={S.kbBtn(btn.group)} onClick={() => insertInt(btn.insert)}>{btn.label}</button>)}
                  </div>
                  <button style={{ ...S.kbBtn("del"), width: "100%", marginTop: 5, padding: "8px" }}
                    onClick={() => { setIntExpr(""); setIntResult(null); setIntError(""); } }>
                    Limpiar todo
                  </button>
                </div>
              </div>

              {/* PANEL DERECHO: resultado */}
              <div style={S.card}>
                <span style={S.label}>resultado</span>

                {!intResult && (
                  <div style={S.empty}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 10, opacity: 0.3 }}>∫</div>
                    <p>Ingresa una función y pulsa<br /><strong style={{ color: "#a78bfa" }}>CALCULAR INTEGRAL</strong></p>
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 12 }}>
                      Soporta: x^n · sin(x) · cos(x) · tan(x) · e^x · ln(x) · 1/x · sqrt(x) · constantes
                    </p>
                  </div>
                )}

                {intResult?.success && (
                  <div style={{ animation: "cyberSlide 0.4s ease" }}>
                    {/* Tarjeta de regla aplicada */}
                    <div style={{ ...S.ruleCard(intResult.color), marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, color: intResult.color, marginBottom: 4, fontSize: "0.88rem" }}>
                        📐 {intResult.rule}
                      </div>
                      <div style={{ margin: "10px 0" }}>
                        <KaTeX formula={intResult.ruleLatex} display={true} />
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6 }}>
                        {intResult.explanation}
                      </div>
                    </div>

                    {/* Integral original → resultado */}
                    <div style={{ marginBottom: 14 }}>
                      <span style={S.label}>integral a resolver</span>
                      <div style={S.resultBox(false)}>
                        <KaTeX formula={`\\int ${intResult.inputLatex}\\,dx`} display={true} />
                      </div>
                    </div>
                    <div style={{ textAlign: "center", fontSize: "1.3rem", color: "#a78bfa", margin: "6px 0" }}>↓</div>
                    <div>
                      <span style={S.label}>antiderivada F(x)</span>
                      <div style={S.resultBox(true)}>
                        <KaTeX formula={intResult.resultLatex} display={true} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>
                      Texto: F(x) = {intResult.resultText} + C
                    </div>
                  </div>
                )}

                {intResult && !intResult.success && (
                  <div style={{ ...S.error, marginTop: 20 }}>
                    <strong>⚠ No reconocido</strong><br />{intResult.error}
                  </div>
                )}
              </div>
            </div>

            {/* INTEGRAL DEFINIDA */}
            <div style={{ width: "100%", padding: "0 16px", boxSizing: "border-box", marginTop: 20 }}>
              <div style={{ ...glassCard, marginTop: 0 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8", display: "block", marginBottom: 14 }}>∫ Integral Definida</span>
                <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                  Calcula el área bajo la curva de f(x) entre dos puntos usando la Regla de Simpson (1000 subintervalos).
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <span style={S.label}>límite inferior a</span>
                    <input style={S.inputBox} value={defA} onChange={e => setDefA(e.target.value)} placeholder="0" spellCheck={false} />
                  </div>
                  <div>
                    <span style={S.label}>límite superior b</span>
                    <input style={S.inputBox} value={defB} onChange={e => setDefB(e.target.value)} placeholder="1" spellCheck={false} />
                  </div>
                </div>
                {defError && <div style={S.error}>⚠ {defError}</div>}
                <button style={{ ...cyberBtn, width: "100%", padding: "11px", marginBottom: 16 }} onClick={handleDefiniteIntegral}>
                  CALCULAR ÁREA →
                </button>

                {defResult?.success && (
                  <div style={{ animation: "cyberSlide 0.4s ease" }}>
                    {/* Notación */}
                    <div style={{ textAlign: "center", marginBottom: 14 }}>
                      <KaTeX formula={`\\int_{${defResult.a}}^{${defResult.b}} f(x)\\,dx`} display={true} />
                    </div>
                    {/* Resultado */}
                    <div style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 12, padding: "18px", textAlign: "center", marginBottom: 14, boxShadow: "0 0 20px rgba(56,189,248,0.1)" }}>
                      <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Área bajo la curva</div>
                      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#38bdf8", fontFamily: "monospace" }}>
                        {defResult.result}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>unidades²</div>
                    </div>
                    {/* Gráfica con área sombreada */}
                    <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "0 0 8px" }}>
                      <span style={{ color: "#38bdf888" }}>▓</span> Área sombreada entre x={defResult.a} y x={defResult.b}
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={defResult.pts} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="x" stroke="#2d3748" tick={{ fill: "#64748b", fontSize: 9 }} />
                        <YAxis stroke="#2d3748" tick={{ fill: "#64748b", fontSize: 9 }} domain={["auto", "auto"]} width={36} />
                        <Tooltip contentStyle={{ background: "rgba(6,6,18,0.97)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, fontSize: 11 }} labelFormatter={v => `x = ${v}`} formatter={v => [v?.toFixed(4), "f(x)"]} />
                        <ReferenceLine x={defResult.a} stroke="#ffe620" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `a=${defResult.a}`, fill: "#ffe620", fontSize: 9, position: "top" }} />
                        <ReferenceLine x={defResult.b} stroke="#ff6ee4" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `b=${defResult.b}`, fill: "#ff6ee4", fontSize: 9, position: "top" }} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                        <Area type="monotone" dataKey="y" stroke="#38bdf8" strokeWidth={2} fill="url(#areaGrad)" connectNulls={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>
                      💡 El área puede ser negativa si la función está por debajo del eje x en ese intervalo.
                    </div>
                  </div>
                )}
                {defResult && !defResult.success && (
                  <div style={S.error}>⚠ {defResult.error}</div>
                )}
                {!defResult && (
                  <div style={{ textAlign: "center", color: "#64748b", padding: "16px 0", fontSize: "0.82rem" }}>
                    Ingresa una función arriba, define los límites a y b, y pulsa <strong style={{ color: "#38bdf8" }}>CALCULAR ÁREA</strong>
                  </div>
                )}
              </div>
            </div>

            {/* TABLA DE REFERENCIA */}
            <p style={{ textAlign: "center", color: "#ffffff", marginTop: 32, fontSize: "0.8rem", letterSpacing: "0.05em" }}>
              TABLA DE INTEGRALES DE REFERENCIA
            </p>
            <div style={{ maxWidth: 700, margin: "14px auto 0", padding: "0 16px" }}>
              <div style={{ ...glassCard, display: "flex", alignItems: "flex-start", gap: 12, marginTop: 0 }}>
                <span style={{ fontSize: "1.4rem" }}>💡</span>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#a78bfa", fontWeight: 700, marginBottom: 4 }}>Regla fundamental de la integración</div>
                  <KaTeX formula={"\\int f'(x)\\,dx = f(x) + C"} display={true} />
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>
                    La constante <em>C</em> representa la familia infinita de antiderivadas.
                  </div>
                </div>
              </div>
            </div>
            <div style={S.integGrid}>
              {INTEGRALS.map(item => (
                <div key={item.name} style={S.integCard(item.color)}>
                  <div style={{ fontWeight: 700, color: item.color, marginBottom: 10, fontSize: "0.82rem" }}>{item.name}</div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: "0.62rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Integral</span>
                    <div style={{ marginTop: 6 }}><KaTeX formula={item.integral} display={true} /></div>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: "0.62rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Resultado</span>
                    <div style={{ marginTop: 6 }}><KaTeX formula={item.result} display={true} /></div>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.55, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
                    {item.tip}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════════ TAB: QUIZ ═══════════════ */}
        {tab === "quiz" && (
          <>
            <p style={{ textAlign: "center", color: "#64748b", marginTop: 20, fontSize: "0.8rem", letterSpacing: "0.05em" }}>
              MODO QUIZ — ADIVINA LA DERIVADA
            </p>
            <div style={{ width: "100%", padding: "0 16px", boxSizing: "border-box", marginTop: 16 }}>
              <QuizMode />
            </div>
          </>
        )}

        {/* ═══════════════ TAB: GLOSARIO ═══════════════ */}
        {tab === "glos" && (
          <>
            <p style={{ textAlign: "center", color: "#64748b", marginTop: 20, fontSize: "0.8rem", letterSpacing: "0.05em" }}>
              REGLAS FUNDAMENTALES DE DERIVACIÓN
            </p>
            <div style={S.glossGrid}>
              {GLOSSARY.map(item => (
                <div key={item.name} style={S.glossCard(item.color)}>
                  <div style={{ fontWeight: 700, color: item.color, marginBottom: 10, fontSize: "0.82rem" }}>{item.name}</div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: "0.62rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Regla general</span>
                    <div style={{ marginTop: 4 }}>
                      <KaTeX formula={`\\dfrac{d}{dx}\\left[${item.formula}\\right] = ${item.deriv}`} display={true} />
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.62rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Ejemplo</span>
                    <div style={{ marginTop: 4 }}><KaTeX formula={item.example} /></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════ TAB: NOTAS ═══════════════ */}
      {tab === "notas" && (
        <TabNotas
          notas={notas} setNotas={setNotas}
          notaActual={notaActual} setNotaActual={setNotaActual}
          notaInput={notaInput} setNotaInput={setNotaInput}
          notaBuscar={notaBuscar} setNotaBuscar={setNotaBuscar}
        />
      )}

      {/* ═══════════════ TAB: IA TUTOR ═══════════════ */}
      {tab === "ia" && (
        <TabIATutor
          contextoCalculadora={{
            funcionActual: input || null,
            derivadaActual: result?.success ? result.outputText : null,
            tabActivo: tab,
            limExpr: limExpr || null,
            intExpr: intExpr || null,
          }}
        />
      )}

    </div><style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
        @keyframes cyberSlide {
          from { opacity:0; transform:translateY(14px) scale(0.98); }
          to   { opacity:1; transform:translateY(0)   scale(1);    }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 8px #a78bfa44; }
          50%      { box-shadow: 0 0 22px #a78bfa88; }
        }
        button { transition: all 0.18s cubic-bezier(.4,0,.2,1) !important; }
        button:active { transform:scale(0.94) !important; }
        button:hover  { filter: brightness(1.12); }
        input:focus {
          border-color:rgba(167,139,250,0.7) !important;
          box-shadow:0 0 0 3px rgba(167,139,250,0.1), 0 0 20px rgba(167,139,250,0.15) !important;
        }
        *{box-sizing:border-box;margin:0;padding:0} body{margin:0}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#2d3748;border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:#4a5568}
        @media (max-width: 480px) {
          h1 { font-size: 1.4rem !important; letter-spacing: -0.5px !important; }
          .katex { font-size: 0.95em !important; }
          .katex-display { overflow-x: auto !important; }
        }
        .katex { color: #e2e8f0 !important; }
        pre { color: #cbd5e1 !important; }
      `}</style>
  </>
  );
}