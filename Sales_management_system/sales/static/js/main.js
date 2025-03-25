// Đảm bảo dùng 'export' và 'import' ES6
window.loadChart = async function loadChart(chartName) {
    console.log(`Loading ${chartName}...`);

    // Xóa chart cũ
    d3.select("#chart-container").html("");

    try {
        // Gọi API Django
        const response = await fetch(`/api/chart-data/${chartName}/`);
        const data = await response.json();
        console.log(`Data ${chartName}:`, data);

        // Import module chart (Dynamic import)
        const chartModule = await import(`./charts/${chartName}.js`);
        chartModule.render(data);
    } catch (error) {
        console.error(`Error when loading ${chartName}:`, error);
    }
};
