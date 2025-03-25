export function render(data) {
    // Chuyển đổi dữ liệu sang mảng số
    const spendingValues = data.map(d => d.total_spent);

    // Kích thước biểu đồ
    const width = 900;
    const height = 500;
    const margin = { top: 70, right: 50, bottom: 50, left: 150 };

    // Tạo SVG container
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .style("font-family", "Arial, sans-serif")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Thiết lập bins (khoảng chi tiêu)
    const maxSpending = d3.max(spendingValues);
    const binWidth = 50000; // Mỗi bin là 50,000
    const bins = d3.bin()
        .domain([0, maxSpending])
        .thresholds(d3.range(0, maxSpending, binWidth))(spendingValues);

    // Thang đo trục x
    const xScale = d3.scaleLinear()
        .domain([0, maxSpending])
        .range([0, width]);

    // Thang đo trục y (số khách hàng)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .nice()
        .range([height, 0]);

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d3.format(",")))
        .append("text")
        .attr("fill", "#000")
        .attr("x", -margin.left)
        .attr("y", -80)
        .attr("text-anchor", "start")
        .attr("transform", `rotate(-90)`)
        .style("font-size", "12px")
        .text("Số lượng khách hàng");

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");

    // Vẽ các cột histogram
    svg.selectAll("rect")
        .data(bins)
        .join("rect")
        .attr("x", d => xScale(d.x0) + 1)
        .attr("y", d => yScale(d.length))
        .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
        .attr("height", d => height - yScale(d.length))
        .attr("fill", "#4e79a7")
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
                .html(`<strong>Chi tiêu từ ${d3.format(",")(d.x0)} đến ${d3.format(",")(d.x1)}</strong><br>Số lượng KH: ${d3.format(",")(d.length)}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    // Định nghĩa hàm formatK
    const formatK = d => `${(d / 1000).toFixed(0)}K`;

    // Thêm nhãn khoảng giá trị dưới mỗi cột
    svg.selectAll(".range-label")
        .data(bins)
        .join("text")
        .attr("class", "range-label")
        .attr("x", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
        .attr("y", height + 25)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .attr("transform", d => `rotate(-90, ${xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2}, ${height + 25})`)
        .text(d => formatK(d.x0));

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Phân phối mức chi tiêu của khách hàng");

}