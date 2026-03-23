Chart.defaults.color = "#94a3b8";
Chart.defaults.font.family = "'Inter', sans-serif";

window.renderCharts = function(dataset) {
    renderTop10Activo(dataset);
    renderTop10Depositos(dataset);
    renderPieChart(dataset);
}

function renderTop10Activo(dataset) {
    const top10 = [...dataset].sort((a,b) => b.activo - a.activo).slice(0, 10);
    
    const canvas = document.getElementById("chartTop10Activo");
    if (Chart.getChart(canvas)) Chart.getChart(canvas).destroy();
    
    window.chartTop10Activo = new Chart(canvas, {
        type: "bar",
        data: {
            labels: top10.map(b => b.nombre.split(" ").slice(0, 3).join(" ")),
            datasets: [{
                label: "Activo Total (MM)",
                data: top10.map(b => (b.activo / 1_000).toFixed(1)),
                backgroundColor: "rgba(59, 130, 246, 0.8)",
                borderRadius: 4
            }]
        },
        options: { 
            indexAxis: "y", 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderTop10Depositos(dataset) {
    const top10 = [...dataset].sort((a,b) => b.depositos - a.depositos).slice(0, 10);
    
    const canvas = document.getElementById("chartTop10Depositos");
    if (Chart.getChart(canvas)) Chart.getChart(canvas).destroy();
    
    window.chartTop10Depositos = new Chart(canvas, {
        type: "bar",
        data: {
            labels: top10.map(b => b.nombre.split(" ").slice(0, 3).join(" ")),
            datasets: [{
                label: "Depósitos (MM)",
                data: top10.map(b => (b.depositos / 1_000).toFixed(1)),
                backgroundColor: "rgba(16, 185, 129, 0.8)",
                borderRadius: 4
            }]
        },
        options: { 
            indexAxis: "y", 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderPieChart(dataset) {
    const top5 = [...dataset].sort((a,b) => b.activo - a.activo).slice(0, 5);
    const otros = dataset.slice(5).reduce((sum, b) => sum + b.activo, 0);
    
    const canvas = document.getElementById("chartPie");
    if (Chart.getChart(canvas)) Chart.getChart(canvas).destroy();
    
    window.chartComposicion = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: [...top5.map(b => b.nombre.split(" ")[1] || b.nombre.split(" ")[0]), "Otros"],
            datasets: [{
                data: [...top5.map(b => b.activo), otros],
                backgroundColor: [
                    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#334155"
                ],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "right" }
            }
        }
    });
}

window.renderIndividualCharts = function(historyData, activo, depositos, prestamos, patrimonio) {
    // 1. Line Chart
    const cEvolucion = document.getElementById("chartEvolucion");
    if (Chart.getChart(cEvolucion)) Chart.getChart(cEvolucion).destroy();
    
    window.chartEvolucion = new Chart(cEvolucion, {
        type: "line",
        data: {
            labels: historyData.map(h => h.label),
            datasets: [
                {
                    label: "Activo",
                    data: historyData.map(h => h.activo / 1_000), // En MM
                    borderColor: "#3b82f6",
                    tension: 0.3
                },
                {
                    label: "Depósitos",
                    data: historyData.map(h => h.depositos / 1_000), // En MM
                    borderColor: "#10b981",
                    tension: 0.3
                },
                {
                    label: "Préstamos",
                    data: historyData.map(h => h.prestamos / 1_000), // En MM
                    borderColor: "#f59e0b",
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false }
        }
    });

    // 2. Donuts
    const cDonaActivo = document.getElementById("chartDonaActivoInd");
    if (Chart.getChart(cDonaActivo)) Chart.getChart(cDonaActivo).destroy();
    
    const otrosActivos = Math.max(0, activo - prestamos);
    window.chartDonaActivoInd = new Chart(cDonaActivo, {
        type: "doughnut",
        data: {
            labels: ["Préstamos (Colocaciones)", "Otros Activos"],
            datasets: [{
                data: [prestamos, otrosActivos],
                backgroundColor: ["#f59e0b", "#334155"],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const cDonaPasivo = document.getElementById("chartDonaPasivoInd");
    if (Chart.getChart(cDonaPasivo)) Chart.getChart(cDonaPasivo).destroy();
    
    const otrosPasivos = Math.max(0, activo - (depositos + patrimonio));
    window.chartDonaPasivoInd = new Chart(cDonaPasivo, {
        type: "doughnut",
        data: {
            labels: ["Depósitos", "Patrimonio", "Otros Pasivos"],
            datasets: [{
                data: [depositos, patrimonio, otrosPasivos],
                backgroundColor: ["#10b981", "#8b5cf6", "#334155"],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
