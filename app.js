const API_KEY = "TU_API_KEY_AQUI"; // REEMPLAZA CON TU CLAVE CMF
const BASE_URL = "https://api.cmfchile.cl/api-sbifv3/recursos_api";

const CUENTAS = {
  activo_total: "100000000",  // TOTAL ACTIVOS
  depositos: "242000000",    // Depósitos y otras captaciones a plazo
  prestamos: "500000000",    // TOTAL COLOCACIONES
  patrimonio: "300000000",   // PATRIMONIO
  resultado: "350000000",    // UTILIDAD DEL EJERCICIO
};

let currentDataset = [];

const CORS_PROXY = "https://corsproxy.io/?";

async function apiFetch(endpoint) {
  const fullUrl = `${BASE_URL}${endpoint}`;
  try {
    // Intentar primero sin proxy (funciona cuando está en servidor)
    const res = await fetch(fullUrl);
    if (res.ok) return await res.json();
    throw new Error(`Direct fetch failed: ${res.status}`);
  } catch (e) {
    // Si es un error de status particular que necesitamos recuperar
    if (e.message.includes("404")) throw new Error("API error: 404");
    // Fallback con proxy CORS para desarrollo local (file://)
    const res = await fetch(CORS_PROXY + encodeURIComponent(fullUrl));
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  }
}

// 1. Obtener lista de instituciones del período
async function fetchInstituciones(year, month) {
  try {
      const data = await apiFetch(`/balances/${year}/${month}/instituciones?apikey=${API_KEY}&formato=json`);
      return data.DescripcionesCodigosDeInstituciones || data.Instituciones || [];
  } catch (err) {
      throw new Error(`Error en CMF Instituciones: ${err.message}`);
  }
}

// 2. Obtener el valor de una cuenta contable para TODOS los bancos del mes
async function fetchCuenta(codigoCuenta, year, month) {
  try {
      const data = await apiFetch(`/balances/${year}/${month}/cuentas/${codigoCuenta}?apikey=${API_KEY}&formato=json`);
      return data.CodigosBalances || data.BloqueBalance || [];
  } catch (err) {
      if (err.message.includes("404")) return []; // Some accounts may be empty for a month
      throw new Error(`Error al cargar cuenta ${codigoCuenta}: ${err.message}`);
  }
}

// 3. Construir dataset combinado con todas las métricas por banco
async function buildDataset(year, month) {
  const [instituciones, activos, depositos, prestamos, patrimonio, resultado] =
    await Promise.all([
      fetchInstituciones(year, month),
      fetchCuenta(CUENTAS.activo_total, year, month),
      fetchCuenta(CUENTAS.depositos, year, month),
      fetchCuenta(CUENTAS.prestamos, year, month),
      fetchCuenta(CUENTAS.patrimonio, year, month),
      fetchCuenta(CUENTAS.resultado, year, month),
    ]);

  // Mapear valores por código de institución (filtrando 999 que es el total del sistema)
  const toMap = (arr) => {
    const map = {};
    arr.forEach(b => {
        const code = b.CodigoInstitucion || b.Codigo;
        if (code === "999") return; // Ignorar total del sistema para no duplicar sumas
        let rawVal = b.MonedaTotal || b.Valor || "0";
        if (typeof rawVal === "string") {
            rawVal = rawVal.replace(/\./g, "").replace(",", ".");
        }
        map[code] = parseFloat(rawVal) || 0;
    });
    return map;
  };

  const activoMap = toMap(activos);
  const depositoMap = toMap(depositos);
  const prestamoMap = toMap(prestamos);
  const patrimonioMap = toMap(patrimonio);
  const resultadoMap = toMap(resultado);

  const totalActivo = Object.values(activoMap).reduce((a, b) => a + b, 0);
  
  // Si totalActivo es 0, probablemente la CMF retornó 404 para todas las cuentas en este período.
  if (totalActivo === 0) {
      throw new Error("Sin datos de cuentas para este período (aún no publicados por la CMF).");
  }

  return instituciones
    .filter(inst => (inst.CodigoInstitucion || inst.Codigo) !== "999")
    .map(inst => ({
      codigo: inst.CodigoInstitucion || inst.Codigo,
      nombre: inst.NombreInstitucion || inst.Nombre || "Banco Desconocido",
      activo: activoMap[inst.CodigoInstitucion || inst.Codigo] || 0,
      pctSistema: totalActivo > 0 ? ((activoMap[inst.CodigoInstitucion || inst.Codigo] || 0) / totalActivo * 100).toFixed(2) : 0,
      depositos: depositoMap[inst.CodigoInstitucion || inst.Codigo] || 0,
      prestamos: prestamoMap[inst.CodigoInstitucion || inst.Codigo] || 0,
      patrimonio: patrimonioMap[inst.CodigoInstitucion || inst.Codigo] || 0,
      resultado: resultadoMap[inst.CodigoInstitucion || inst.Codigo] || 0,
  })).sort((a, b) => b.activo - a.activo);
}

// UI LOGIC
document.addEventListener("DOMContentLoaded", () => {
    const btnLoad = document.getElementById("btnLoadPeriod");
    const bankSelect = document.getElementById("bankSelect");
    const btnExportCSV = document.getElementById("btnExportCSV");
    const btnRetry = document.getElementById("btnRetry");
    
    btnLoad.addEventListener("click", () => {
        const y = document.getElementById("periodYear").value;
        const m = document.getElementById("periodMonth").value;
        loadData(y, m);
    });

    btnRetry.addEventListener("click", () => {
        const y = document.getElementById("periodYear").value;
        const m = document.getElementById("periodMonth").value;
        loadData(y, m);
    });

    btnExportCSV.addEventListener("click", () => {
        const y = document.getElementById("periodYear").value;
        const m = document.getElementById("periodMonth").value;
        if (currentDataset.length > 0) exportToCSV(currentDataset, y, m);
    });

    bankSelect.addEventListener("change", (e) => {
        const y = document.getElementById("periodYear").value;
        const m = document.getElementById("periodMonth").value;
        updateUI(currentDataset, e.target.value, window.previousDataset, y, m);
    });

    // Load default period
    const initY = document.getElementById("periodYear").value;
    const initM = document.getElementById("periodMonth").value;
    loadData(initY, initM);
});

function toggleSkeletons(show) {
    const kpis = document.querySelectorAll('.kpi-value');
    if (show) {
        kpis.forEach(el => { el.innerText = "000"; el.classList.add('skeleton'); });
    } else {
        kpis.forEach(el => el.classList.remove('skeleton'));
    }
}

async function loadData(year, month) {
    const loader = document.getElementById("loader");
    const errorContainer = document.getElementById("errorContainer");
    
    loader.classList.remove("hidden");
    errorContainer.classList.add("hidden");
    toggleSkeletons(true);

    try {
        const [dataset, datasetAnterior] = await Promise.all([
            buildDataset(year, month),
            buildDataset(year - 1, month).catch(() => []) // Fallback vacío si falla (ej. sin datos)
        ]);

        if (dataset.length === 0) throw new Error("No hay datos para este período.");
        
        currentDataset = dataset;
        window.previousDataset = datasetAnterior; // Guardar dataset anterior
        
        document.getElementById("dashboardContent").classList.remove("hidden");
        toggleSkeletons(false);

        populateBankSelector(dataset);
        updateUI(dataset, "ALL", datasetAnterior, year, month);
        
    } catch (err) {
        console.error("Error cargando variables:", err);
        document.getElementById("errorMessage").innerText = err.message;
        errorContainer.classList.remove("hidden");
        toggleSkeletons(false);
    } finally {
        loader.classList.add("hidden");
    }
}

function formatMM(valorEnMillones) {
  if (valorEnMillones === null || valorEnMillones === undefined) return "N/D";
  const num = parseFloat(valorEnMillones);
  if (isNaN(num)) return "N/D";
  
  const abs = Math.abs(num);
  
  if (abs >= 1_000_000) {
    // Billones (un billón = un millón de millones)
    const val = (num / 1_000_000).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return `${num < 0 ? '-' : ''}${val} B`;
  } else if (abs >= 1_000) {
    // Miles de millones
    const val = (num / 1_000).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return `${num < 0 ? '-' : ''}${val} MM`;
  } else {
    // Millones
    const val = num.toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return `${num < 0 ? '-' : ''}${val} M`;
  }
}

function getMesNombre(mesNumero) {
    const meses = {
        "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
        "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic"
    };
    return meses[String(mesNumero).padStart(2, '0')] || "--";
}

function renderVariation(actual, anterior, label) {
    if (!anterior || anterior === 0) return `<span class="kpi-variation" style="color:var(--text-secondary)">-- vs. ${label}</span>`;
    
    const varPct = ((actual - anterior) / anterior) * 100;
    const isPositive = varPct >= 0;
    const icon = isPositive ? "↑" : "↓";
    const cssClass = isPositive ? "positive" : "negative";
    const sign = isPositive ? "+" : "";
    
    return `<span class="${cssClass}">${icon} ${sign}${varPct.toFixed(1)}% vs. ${label}</span>`;
}

function exportToCSV(dataset, year, month) {
    let csvContent = "Rank,Entidad,Código,Activo,%Sistema,Depósitos,Préstamos,Patrimonio,Resultado\n";
    dataset.forEach((b, idx) => {
        const row = [
            idx + 1,
            `"${b.nombre}"`,
            b.codigo,
            b.activo,
            b.pctSistema,
            b.depositos,
            b.prestamos,
            b.patrimonio,
            b.resultado
        ].join(",");
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const mStr = getMesNombre(month).toLowerCase();
    link.setAttribute("download", `balances-bancos-chile-${mStr}-${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function setKpiText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const formatted = formatMM(value);
    el.innerText = formatted;
    
    // Fix tooltips dynamically based on B / MM
    const unitEl = el.nextElementSibling;
    if (unitEl && unitEl.classList.contains("kpi-unit")) {
        if (formatted.includes("B")) unitEl.innerText = "miles de millones CLP";
        else unitEl.innerText = "millones CLP";
    }
}

function populateBankSelector(dataset) {
    const sel = document.getElementById("bankSelect");
    // Conservar la opción seleccionada si se cambia el mes y la entidad aún existe
    const prevVal = sel.value;
    
    sel.innerHTML = '<option value="ALL">Sistema Completo (Todos)</option>';
    dataset.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.codigo;
        opt.innerText = b.nombre;
        sel.appendChild(opt);
    });
    
    if (prevVal !== "ALL" && dataset.some(d => d.codigo === prevVal)) {
        sel.value = prevVal;
    }
}

function updateUI(dataset, selectedBank, datasetAnterior, year, month) {
    // Filter for KPIs
    let dataToSum = dataset;
    let dataAnteriorToSum = datasetAnterior || [];
    
    if (selectedBank !== "ALL") {
        dataToSum = dataset.filter(b => b.codigo === selectedBank);
        dataAnteriorToSum = (datasetAnterior || []).filter(b => b.codigo === selectedBank);
    }
    
    const sumActivo = dataToSum.reduce((acc, b) => acc + b.activo, 0);
    const sumDepositos = dataToSum.reduce((acc, b) => acc + b.depositos, 0);
    const sumPrestamos = dataToSum.reduce((acc, b) => acc + b.prestamos, 0);
    const sumPatrimonio = dataToSum.reduce((acc, b) => acc + b.patrimonio, 0);
    const sumResultado = dataToSum.reduce((acc, b) => acc + b.resultado, 0);

    const sumActivoAnt = dataAnteriorToSum.reduce((acc, b) => acc + b.activo, 0);
    const sumDepositosAnt = dataAnteriorToSum.reduce((acc, b) => acc + b.depositos, 0);
    const sumPrestamosAnt = dataAnteriorToSum.reduce((acc, b) => acc + b.prestamos, 0);
    const sumPatrimonioAnt = dataAnteriorToSum.reduce((acc, b) => acc + b.patrimonio, 0);
    const sumResultadoAnt = dataAnteriorToSum.reduce((acc, b) => acc + b.resultado, 0);

    const prevLabel = `${getMesNombre(month)}-${year - 1}`;

    if (selectedBank === "ALL") {
        document.getElementById("seccion-banco-individual").classList.add("hidden");
        // Update general KPIs
        setKpiText("kpiActivo", sumActivo);
        setKpiText("kpiDepositos", sumDepositos);
        setKpiText("kpiPrestamos", sumPrestamos);
        setKpiText("kpiPatrimonio", sumPatrimonio);

        document.getElementById("kpiActivoVar").innerHTML = renderVariation(sumActivo, sumActivoAnt, prevLabel);
        document.getElementById("kpiDepositosVar").innerHTML = renderVariation(sumDepositos, sumDepositosAnt, prevLabel);
        document.getElementById("kpiPrestamosVar").innerHTML = renderVariation(sumPrestamos, sumPrestamosAnt, prevLabel);
        document.getElementById("kpiPatrimonioVar").innerHTML = renderVariation(sumPatrimonio, sumPatrimonioAnt, prevLabel);
    } else {
        document.getElementById("seccion-banco-individual").classList.remove("hidden");
        
        const bName = dataset.find(b => b.codigo === selectedBank)?.nombre || "Banco";
        document.getElementById("individualBankName").innerText = bName;

        setKpiText("kpiIndActivo", sumActivo);
        setKpiText("kpiIndDepositos", sumDepositos);
        setKpiText("kpiIndPrestamos", sumPrestamos);
        setKpiText("kpiIndPatrimonio", sumPatrimonio);
        setKpiText("kpiIndResultado", sumResultado);

        document.getElementById("kpiIndActivoVar").innerHTML = renderVariation(sumActivo, sumActivoAnt, prevLabel);
        document.getElementById("kpiIndDepositosVar").innerHTML = renderVariation(sumDepositos, sumDepositosAnt, prevLabel);
        document.getElementById("kpiIndPrestamosVar").innerHTML = renderVariation(sumPrestamos, sumPrestamosAnt, prevLabel);
        document.getElementById("kpiIndPatrimonioVar").innerHTML = renderVariation(sumPatrimonio, sumPatrimonioAnt, prevLabel);
        document.getElementById("kpiIndResultadoVar").innerHTML = renderVariation(sumResultado, sumResultadoAnt, prevLabel);

        renderRatios(sumActivo, sumDepositos, sumPrestamos, sumPatrimonio, sumResultado);
        loadIndividualHistory(selectedBank, year, month, sumActivo, sumDepositos, sumPrestamos, sumPatrimonio);

        setTimeout(() => {
            document.getElementById("seccion-banco-individual").scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // Update charts (Always show system-wide for top charts to keep context)
    window.renderCharts(dataset);

    // Update table
    renderTable(dataset, selectedBank);
}

function renderRatios(activo, depositos, prestamos, patrimonio, resultado) {
    const elROA = document.getElementById("valROA");
    const cardROA = document.getElementById("cardROA");
    const roa = activo > 0 ? (resultado / activo) * 100 : 0;
    elROA.innerText = roa.toFixed(2) + "%";
    cardROA.className = "chart-card ratio-card " + (roa > 0.5 ? "bg-green" : (roa >= 0 ? "bg-yellow" : "bg-red"));

    const elROE = document.getElementById("valROE");
    const cardROE = document.getElementById("cardROE");
    const roe = patrimonio > 0 ? (resultado / patrimonio) * 100 : 0;
    elROE.innerText = roe.toFixed(2) + "%";
    cardROE.className = "chart-card ratio-card " + (roe > 5 ? "bg-green" : (roe >= 0 ? "bg-yellow" : "bg-red"));

    const elLTD = document.getElementById("valLTD");
    const cardLTD = document.getElementById("cardLTD");
    const ltd = depositos > 0 ? (prestamos / depositos) * 100 : 0;
    elLTD.innerText = ltd.toFixed(2) + "%";
    cardLTD.className = "chart-card ratio-card " + ((ltd >= 60 && ltd <= 90) ? "bg-green" : (ltd > 110 ? "bg-red" : "bg-yellow"));
}

function getLast12Periods(currentYear, currentMonth) {
    let y = parseInt(currentYear);
    let m = parseInt(currentMonth);
    const periods = [];
    for (let i = 0; i < 12; i++) {
        const sm = String(m).padStart(2, '0');
        periods.unshift({ year: String(y), month: sm });
        m--;
        if (m === 0) {
            m = 12;
            y--;
        }
    }
    return periods;
}

async function fetchBankMonth(codigo, year, month) {
    try {
        const data = await apiFetch(`/balances/${year}/${month}/instituciones/${codigo}?apikey=${API_KEY}&formato=json`);
        const records = data.CodigosBalances || data.BloqueBalance || [];
        
        let act = 0, dep = 0, pres = 0;
        records.forEach(r => {
            const c = r.CodigoCuenta;
            let v = r.MonedaTotal || r.Valor || "0";
            if (typeof v === "string") v = v.replace(/\./g, "").replace(",", ".");
            v = parseFloat(v) || 0;
            
            if (c === CUENTAS.activo_total) act = v;
            if (c === CUENTAS.depositos) dep = v;
            if (c === CUENTAS.prestamos) pres = v;
        });
        
        return {
            label: `${getMesNombre(month)}-${year.slice(2)}`,
            activo: act,
            depositos: dep,
            prestamos: pres
        };
    } catch (e) {
        return null;
    }
}

async function loadIndividualHistory(codigo, year, month, currActivo, currDepositos, currPrestamos, currPatrimonio) {
    const chartsContent = document.getElementById("individualChartsContent");
    const individualLoader = document.getElementById("individualLoader");
    
    chartsContent.style.display = "none";
    individualLoader.classList.remove("hidden");
    
    try {
        const periods = getLast12Periods(year, month);
        const promises = periods.map(p => fetchBankMonth(codigo, p.year, p.month));
        const results = await Promise.all(promises);
        
        const validHistory = results.filter(r => r !== null);
        
        if (window.renderIndividualCharts) {
            window.renderIndividualCharts(validHistory, currActivo, currDepositos, currPrestamos, currPatrimonio);
        }
    } catch (e) {
        console.error("Error cargando historial del banco individual:", e);
    } finally {
        individualLoader.classList.add("hidden");
        chartsContent.style.display = "block";
    }
}

function renderTable(dataset, selectedBank) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    
    if (!dataset || dataset.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#888;">No hay datos disponibles para el período seleccionado</td></tr>`;
        return;
    }

    dataset.forEach((b, idx) => {
        const tr = document.createElement("tr");
        if (selectedBank !== "ALL" && b.codigo !== selectedBank) {
            tr.style.opacity = "0.3";
        } else if (selectedBank !== "ALL" && b.codigo === selectedBank) {
            tr.style.background = "var(--bg-card-hover)";
            tr.style.fontWeight = "bold";
        }

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${b.nombre}</td>
            <td class="text-right">${formatMM(b.activo)}</td>
            <td class="text-right">${b.pctSistema}%</td>
            <td class="text-right">${formatMM(b.depositos)}</td>
            <td class="text-right">${formatMM(b.prestamos)}</td>
            <td class="text-right">${formatMM(b.patrimonio)}</td>
            <td class="text-right ${b.resultado < 0 ? 'negative' : 'positive'}">${formatMM(b.resultado)}</td>
        `;
        tbody.appendChild(tr);
    });
}
