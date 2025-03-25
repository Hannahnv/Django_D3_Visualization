export function render(data) {
    console.log("Dữ liệu Q8:", data);

    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để vẽ biểu đồ.");
        return;
    }

    // Chiều rộng và cao của biểu đồ
    const width = 750;
    const height = 450;
    const margin = { top: 50, right: 200, bottom: 100, left: 150 };

    // Tạo vùng vẽ SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Danh sách tháng
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // Nhóm dữ liệu theo nhóm hàng
    const groupedData = d3.group(data, d => `[${d.groupCode}] ${d.groupName}`);

    // Thang đo x (tháng)
    const xScale = d3.scaleLinear()
        .domain([1, 12])
        .range([0, width]);

    // Thang đo y (xác suất)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.probability)])
        .nice()
        .range([height, 0]);

    // Màu sắc nhóm hàng
    const colorScale = d3.scaleOrdinal()
        .domain(Array.from(groupedData.keys()))
        .range(d3.schemeTableau10);

    // Vẽ lưới dọc
    svg.selectAll("grid-line")
        .data(xScale.ticks())
        .join("line")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(xScale)
                .ticks(12)
                .tickFormat(d => `Tháng ${String(d).padStart(2, "0")}`)
        )
        .selectAll("text")
        .style("text-anchor", "middle");

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d3.format(".0%")));

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("visibility", "hidden");

    // Tạo line generator
    const line = d3.line()
        .x(d => xScale(d.month))
        .y(d => yScale(d.probability));



    // Vẽ đường và điểm cho từng nhóm hàng
    groupedData.forEach((values, groupName) => {
        values.sort((a, b) => a.month - b.month);

        // Vẽ đường
        svg.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", colorScale(groupName))
            .attr("stroke-width", 1.5)
            .attr("d", line);

        // Vẽ điểm
        svg.selectAll(`.circle-${groupName}`)
            .data(values)
            .join("circle")
            .attr("cx", d => xScale(d.month))
            .attr("cy", d => yScale(d.probability))
            .attr("r", 4)
            .attr("fill", colorScale(groupName))
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                    .html(`<strong>Tháng ${String(d.month).padStart(2, "0")}</strong><br>Nhóm hàng: ${groupName}<br>Xác suất Bán: ${d3.format(".1%")(d.probability)}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });
    });

    // Thêm legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 30}, 0)`);

    Array.from(groupedData.keys()).forEach((groupName, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", colorScale(groupName));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .style("text-anchor", "start")
            .style("font-size", "11px")
            .text(groupName);
    });

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng của Nhóm hàng theo Tháng");
}
