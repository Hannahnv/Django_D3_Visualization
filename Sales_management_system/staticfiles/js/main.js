// main.js: Xử lý khi nhấn nút Q1, Q2, ...
async function loadChart(chartName) {
    try {
        console.log(`Loading ${chartName}...`);

        // 1. Xóa biểu đồ cũ
        d3.select("#chart-container").html("");

        // 2. Gọi API Django để lấy JSON cho từng chart
        const response = await fetch(`/api/chart-data/${chartName}/`);
        const data = await response.json();
        console.log(`Data ${chartName}:`, data);

        // 3. Load file chart tương ứng và vẽ
        const chartModule = await import(`./charts/${chartName}.js`);
        chartModule.render(data);

    } catch (error) {
        console.error(`Error when loading ${chartName}:`, error);
    }
}
